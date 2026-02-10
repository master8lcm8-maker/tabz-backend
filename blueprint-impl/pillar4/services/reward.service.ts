export function computeRewardCents(kind: 'REFERRAL_SIGNUP'|'REFERRAL_FIRST_ACTION'): number { return kind==='REFERRAL_SIGNUP'?100:300; }
