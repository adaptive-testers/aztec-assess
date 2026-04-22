"""
Bayesian Knowledge Tracing (BKT) update step.

Standard two-parameter update: Bayes on observation, then learning transition P(T).
"""


def clamp_p(p: float) -> float:
    return max(0.001, min(0.999, p))


def bkt_posterior_then_learn(
    p_knowledge: float,
    is_correct: bool,
    *,
    p_guess: float,
    p_slip: float,
    p_learn: float,
) -> float:
    """
    One observation update: posterior P(L | response), then P(L') = P(L|obs) + (1-P(L|obs))*P(T).

    p_guess: P(correct | not learned)
    p_slip: P(wrong | learned)
    p_learn: P(learn) after opportunity
    """
    p = clamp_p(float(p_knowledge))
    pg = clamp_p(float(p_guess))
    ps = clamp_p(float(p_slip))
    pt = clamp_p(float(p_learn))

    if is_correct:
        num = p * (1.0 - ps)
        den = num + (1.0 - p) * pg
    else:
        num = p * ps
        den = num + (1.0 - p) * (1.0 - pg)
    posterior = p if den <= 0 else num / den

    posterior = clamp_p(posterior)
    p_new = posterior + (1.0 - posterior) * pt
    return clamp_p(p_new)
