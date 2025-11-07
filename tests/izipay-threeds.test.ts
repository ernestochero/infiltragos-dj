import { describe, it, expect } from 'vitest';
import { detectThreeDSFailure, extractThreeDSInfo } from '@payment/izipay/threeds';

describe('extractThreeDSInfo', () => {
  it('finds threeDS info nested within transactions', () => {
    const info = extractThreeDSInfo({
      transactions: [
        {
          status: 'AUTHORISED',
          threeDSAuthentication: {
            transStatus: 'Y',
            status: 'SUCCESS',
            challengeResult: 'ACCEPTED',
          },
        },
      ],
    });
    expect(info).toBeTruthy();
    expect(info?.transStatus).toBe('Y');
    expect(info?.status).toBe('SUCCESS');
  });

  it('returns null when payload lacks 3DS hints', () => {
    const info = extractThreeDSInfo({ status: 'PAID' });
    expect(info).toBeNull();
  });
});

describe('detectThreeDSFailure', () => {
  it('detects refusal from transStatus R', () => {
    const failure = detectThreeDSFailure({
      payment: {
        transactions: [
          {
            threeDSAuthentication: {
              transStatus: 'R',
              challengeResult: 'REJECTED',
              reasonMessage: 'Cardholder refused challenge',
            },
          },
        ],
      },
    });
    expect(failure).toBeTruthy();
    expect(failure?.code).toBe('3DS_TRANS_R');
    expect(failure?.message).toContain('transStatus=R');
  });

  it('detects timeout when only challengeResult is present', () => {
    const failure = detectThreeDSFailure({
      threeDS: {
        challengeResult: 'TIMEOUT',
        message: 'Challenge not completed',
      },
    });
    expect(failure).toBeTruthy();
    expect(failure?.code).toBe('3DS_CHALLENGE_TIMEOUT');
    expect(failure?.message).toContain('challenge=TIMEOUT');
  });

  it('returns null for successful authentication', () => {
    const failure = detectThreeDSFailure({
      threeDSAuthentication: {
        transStatus: 'Y',
        challengeResult: 'ACCEPTED',
      },
    });
    expect(failure).toBeNull();
  });
});
