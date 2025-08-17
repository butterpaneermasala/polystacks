;; Polystacks binary prediction markets MVP
;; Admin creates markets; users stake STX on yes/no; resolver sets outcome; winners withdraw pro-rata.

(define-constant ERR-NOT-ADMIN u100)
(define-constant ERR-MARKET-NOT-FOUND u101)
(define-constant ERR-MARKET-CLOSED u102)
(define-constant ERR-BEFORE-DEADLINE u103)
(define-constant ERR-NOT-RESOLVER u104)
(define-constant ERR-NOT-RESOLVED u105)
(define-constant ERR-ALREADY-CLAIMED u106)
(define-constant ERR-ZERO-AMOUNT u107)
(define-constant ERR-ALREADY-RESOLVED u108)
(define-constant ERR-DEADLINE-INVALID u109)
(define-constant ERR-FEE-ALREADY-CLAIMED u110)

(define-data-var admin (optional principal) none)
(define-data-var next-id uint u0)

(define-map markets
  { id: uint }
  { question: (string-utf8 256),
    deadline: uint,
    resolver: principal,
    fee-bps: uint,
    fee-recipient: principal,
    status: uint, ;; 0=open, 1=locked (unused for now), 2=resolved
    outcome: (optional bool) ;; some(true)=yes, some(false)=no, none = refund mode
  }
)

(define-map totals
  { id: uint }
  { yes: uint, no: uint }
)

;; renamed to avoid colliding with function names
(define-map stakes-yes-map
  { id: uint, user: principal }
  { amount: uint }
)

(define-map stakes-no-map
  { id: uint, user: principal }
  { amount: uint }
)

(define-map claimed
  { id: uint, user: principal }
  { done: bool }
)

(define-map fee-claimed
  { id: uint }
  { done: bool }
)

(define-read-only (get-admin)
  (ok (var-get admin))
)

(define-public (set-admin (new principal))
  (begin
    (match (var-get admin) a
      (if (is-eq a tx-sender)
          (begin (var-set admin (some new)) (ok true))
          (err ERR-NOT-ADMIN)
      )
      (begin (var-set admin (some new)) (ok true))
    )
  )
)

(define-read-only (get-market (id uint))
  (map-get? markets { id: id })
)

(define-read-only (get-totals (id uint))
  (default-to { yes: u0, no: u0 }
    (map-get? totals { id: id })
  )
)

(define-read-only (get-stake-yes (id uint) (user principal))
  (get amount (default-to { amount: u0 } (map-get? stakes-yes-map { id: id, user: user })))
)

(define-read-only (get-stake-no (id uint) (user principal))
  (get amount (default-to { amount: u0 } (map-get? stakes-no-map { id: id, user: user })))
)

(define-read-only (has-claimed (id uint) (user principal))
  (is-some (map-get? claimed { id: id, user: user }))
)

(define-read-only (fee-already-claimed (id uint))
  (is-some (map-get? fee-claimed { id: id }))
)

(define-private (assert-admin)
  (match (var-get admin) a
    (if (is-eq a tx-sender) (ok true) (err ERR-NOT-ADMIN))
    (err ERR-NOT-ADMIN)
  )
)

(define-read-only (is-open (id uint))
  (let ((m (map-get? markets { id: id })))
    (match m
      market (and (is-eq u0 (get status market)) (< stacks-block-height (get deadline market)))
      false
    )
  )
)

(define-public (create-market (question (string-utf8 256)) (deadline uint) (resolver principal) (fee-bps uint) (fee-recipient principal))
  (begin
    (try! (assert-admin))
    (if (<= deadline stacks-block-height) (err ERR-DEADLINE-INVALID)
      (let ((id (var-get next-id)))
        (begin
          (map-set markets { id: id }
            { question: question,
              deadline: deadline,
              resolver: resolver,
              fee-bps: fee-bps,
              fee-recipient: fee-recipient,
              status: u0,
              outcome: none
            }
          )
          (var-set next-id (+ id u1))
          (ok id)
        )
      )
    )
  )
)

(define-public (resolve (id uint) (outcome bool))
  (let ((m (map-get? markets { id: id })))
    (match m
      market
        (begin
          (try! (if (>= stacks-block-height (get deadline market)) (ok true) (err ERR-BEFORE-DEADLINE)))
          (try! (if (is-eq u2 (get status market)) (err ERR-ALREADY-RESOLVED) (ok true)))
          (try! (if (is-eq tx-sender (get resolver market)) (ok true) (err ERR-NOT-RESOLVER)))
          (let ((tot (default-to { yes: u0, no: u0 } (map-get? totals { id: id }))))
            (if (or (is-eq (get yes tot) u0) (is-eq (get no tot) u0))
                (map-set markets { id: id } (merge market { status: u2, outcome: none }))
                (map-set markets { id: id } (merge market { status: u2, outcome: (some outcome) }))
            )
            (map-delete fee-claimed { id: id })
          )
          (ok true)
        )
      (err ERR-MARKET-NOT-FOUND)
    )
  )
)

(define-read-only (compute-fee (losing uint) (bps uint))
  (to-uint (/ (* (to-int losing) (to-int bps)) 10000))
)

(define-public (withdraw (id uint))
  (let ((m (map-get? markets { id: id })))
    (match m
      market
        (begin
          (try! (if (is-eq u2 (get status market)) (ok true) (err ERR-NOT-RESOLVED)))
          (try! (if (is-some (map-get? claimed { id: id, user: tx-sender })) (err ERR-ALREADY-CLAIMED) (ok true)))
          (let ((tot (default-to { yes: u0, no: u0 } (map-get? totals { id: id })))
                (y (default-to { amount: u0 } (map-get? stakes-yes-map { id: id, user: tx-sender })))
                (n (default-to { amount: u0 } (map-get? stakes-no-map { id: id, user: tx-sender })))
                (res (get outcome market)))
            (match res out
              (if out
                  (let ((totalW (get yes tot))
                        (totalL (get no tot))
                        (stake (get amount y))
                        (fee (compute-fee (get no tot) (get fee-bps market))))
                    (let ((payout (if (is-eq totalW u0)
                                    u0
                                    (+ stake (to-uint (/ (* (to-int stake) (to-int (- totalL fee))) (to-int totalW)))))))
                      (if (is-eq payout u0)
                        (ok false)
                        (begin
                          (map-set claimed { id: id, user: tx-sender } { done: true })
                          (try! (as-contract (stx-transfer? payout (as-contract tx-sender) tx-sender)))
                          (ok true)
                        )
                      )
                    )
                  )
                  (let ((totalW (get no tot))
                        (totalL (get yes tot))
                        (stake (get amount n))
                        (fee (compute-fee (get yes tot) (get fee-bps market))))
                    (let ((payout (if (is-eq totalW u0)
                                    u0
                                    (+ stake (to-uint (/ (* (to-int stake) (to-int (- totalL fee))) (to-int totalW)))))))
                      (if (is-eq payout u0)
                        (ok false)
                        (begin
                          (map-set claimed { id: id, user: tx-sender } { done: true })
                          (try! (as-contract (stx-transfer? payout (as-contract tx-sender) tx-sender)))
                          (ok true)
                        )
                      )
                    )
                  )
              )
              (let ((refund (+ (get amount y) (get amount n))))
                (if (is-eq refund u0)
                  (ok false)
                  (begin
                    (map-set claimed { id: id, user: tx-sender } { done: true })
                    ;; transfer from contract to user
                    (try! (as-contract (stx-transfer? refund (as-contract tx-sender) tx-sender)))
                    (ok true)
                  )
                )
              )
            )
          )
        )
      (err ERR-MARKET-NOT-FOUND)
    )
  )
)

(define-public (withdraw-fee (id uint))
  (let ((m (map-get? markets { id: id })))
    (match m
      market
        (let ((res (get outcome market)))
          (match res out
            (if (is-some (map-get? fee-claimed { id: id }))
              (err ERR-FEE-ALREADY-CLAIMED)
              (let ((tot (default-to { yes: u0, no: u0 } (map-get? totals { id: id })))
                    (fee (if out
                              (compute-fee (get no tot) (get fee-bps market))
                              (compute-fee (get yes tot) (get fee-bps market)))))
                (begin
                  (map-set fee-claimed { id: id } { done: true })
                  (try! (as-contract (stx-transfer? fee (as-contract tx-sender) (get fee-recipient market))))
                  (ok true)
                )
              )
            )
            (ok false)
          )
        )
      (err ERR-MARKET-NOT-FOUND)
    )
  )
)

;; Stake functions
(define-public (stake-yes (id uint) (amount uint))
  (if (is-eq amount u0) (err ERR-ZERO-AMOUNT)
    (let ((m (map-get? markets { id: id })))
      (match m
        market
          (if (and (is-eq u0 (get status market)) (< stacks-block-height (get deadline market)))
            (begin
              ;; user -> contract
              (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
              (let ((t (default-to { yes: u0, no: u0 } (map-get? totals { id: id })))
                    (prev (default-to { amount: u0 } (map-get? stakes-yes-map { id: id, user: tx-sender }))))
                (map-set totals { id: id } { yes: (+ (get yes t) amount), no: (get no t) })
                (map-set stakes-yes-map { id: id, user: tx-sender } { amount: (+ (get amount prev) amount) })
                (ok true)
              )
            )
            (err ERR-MARKET-CLOSED)
          )
        (err ERR-MARKET-NOT-FOUND)
      )
    )
  )
)

(define-public (stake-no (id uint) (amount uint))
  (if (is-eq amount u0) (err ERR-ZERO-AMOUNT)
    (let ((m (map-get? markets { id: id })))
      (match m
        market
          (if (and (is-eq u0 (get status market)) (< stacks-block-height (get deadline market)))
            (begin
              ;; user -> contract
              (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
              (let ((t (default-to { yes: u0, no: u0 } (map-get? totals { id: id })))
                    (prev (default-to { amount: u0 } (map-get? stakes-no-map { id: id, user: tx-sender }))))
                (map-set totals { id: id } { yes: (get yes t), no: (+ (get no t) amount) })
                (map-set stakes-no-map { id: id, user: tx-sender } { amount: (+ (get amount prev) amount) })
                (ok true)
              )
            )
            (err ERR-MARKET-CLOSED)
          )
        (err ERR-MARKET-NOT-FOUND)
      )
    )
  )
)
