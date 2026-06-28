import { LiquidationStatus } from '@prisma/client';

// Validation matrix based on LiquidationRecordsService.VALID_TRANSITIONS
const VALID_TRANSITIONS: Record<LiquidationStatus, LiquidationStatus[]> = {
  [LiquidationStatus.DRAFT]: [LiquidationStatus.PENDING_APPROVAL, LiquidationStatus.CANCELLED],
  [LiquidationStatus.PENDING_APPROVAL]: [LiquidationStatus.APPROVED, LiquidationStatus.REJECTED, LiquidationStatus.CANCELLED],
  [LiquidationStatus.APPROVED]: [LiquidationStatus.COMPLETED],
  [LiquidationStatus.REJECTED]: [LiquidationStatus.DRAFT],
  [LiquidationStatus.COMPLETED]: [],
  [LiquidationStatus.CANCELLED]: [],
};

function isValidTransition(from: LiquidationStatus, to: LiquidationStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

describe('Liquidation Transition Matrix', () => {
  it('DRAFT can go to PENDING_APPROVAL', () => {
    expect(isValidTransition(LiquidationStatus.DRAFT, LiquidationStatus.PENDING_APPROVAL)).toBe(true);
  });

  it('DRAFT can go to CANCELLED', () => {
    expect(isValidTransition(LiquidationStatus.DRAFT, LiquidationStatus.CANCELLED)).toBe(true);
  });

  it('DRAFT cannot go directly to APPROVED', () => {
    expect(isValidTransition(LiquidationStatus.DRAFT, LiquidationStatus.APPROVED)).toBe(false);
  });

  it('DRAFT cannot go directly to COMPLETED', () => {
    expect(isValidTransition(LiquidationStatus.DRAFT, LiquidationStatus.COMPLETED)).toBe(false);
  });

  it('PENDING_APPROVAL can go to APPROVED', () => {
    expect(isValidTransition(LiquidationStatus.PENDING_APPROVAL, LiquidationStatus.APPROVED)).toBe(true);
  });

  it('PENDING_APPROVAL can go to REJECTED', () => {
    expect(isValidTransition(LiquidationStatus.PENDING_APPROVAL, LiquidationStatus.REJECTED)).toBe(true);
  });

  it('PENDING_APPROVAL can go to CANCELLED', () => {
    expect(isValidTransition(LiquidationStatus.PENDING_APPROVAL, LiquidationStatus.CANCELLED)).toBe(true);
  });

  it('PENDING_APPROVAL cannot go to COMPLETED', () => {
    expect(isValidTransition(LiquidationStatus.PENDING_APPROVAL, LiquidationStatus.COMPLETED)).toBe(false);
  });

  it('APPROVED can go to COMPLETED', () => {
    expect(isValidTransition(LiquidationStatus.APPROVED, LiquidationStatus.COMPLETED)).toBe(true);
  });

  it('APPROVED cannot go to CANCELLED', () => {
    expect(isValidTransition(LiquidationStatus.APPROVED, LiquidationStatus.CANCELLED)).toBe(false);
  });

  it('REJECTED can go to DRAFT', () => {
    expect(isValidTransition(LiquidationStatus.REJECTED, LiquidationStatus.DRAFT)).toBe(true);
  });

  it('COMPLETED and CANCELLED are terminal states', () => {
    expect(isValidTransition(LiquidationStatus.COMPLETED, LiquidationStatus.DRAFT)).toBe(false);
    expect(isValidTransition(LiquidationStatus.COMPLETED, LiquidationStatus.APPROVED)).toBe(false);
    expect(isValidTransition(LiquidationStatus.CANCELLED, LiquidationStatus.DRAFT)).toBe(false);
    expect(isValidTransition(LiquidationStatus.CANCELLED, LiquidationStatus.PENDING_APPROVAL)).toBe(false);
  });
});
