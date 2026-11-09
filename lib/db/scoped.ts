/**
 * Scoped Data Access Layer.
 * Guarantees that every query performed by a retailer is strictly scoped to `session.retailerId`.
 * Prevents Insecure Direct Object Reference (IDOR) attacks at the query boundary.
 */

import { SessionPayload } from "../auth/session";

export class ScopedDataAccess {
  private readonly session: SessionPayload;

  constructor(session: SessionPayload) {
    this.session = session;
  }

  /**
   * Retrieves the authenticated retailer ID. Throws if session is not a retailer.
   */
  public getRetailerId(): string {
    if (this.session.role !== "retailer" || !this.session.retailerId) {
      throw new Error("UNAUTHORIZED_RETAILER_ACCESS");
    }
    return this.session.retailerId;
  }

  /**
   * Builds a Prisma where clause for order queries strictly bound to this retailer.
   */
  public scopeOrderWhere(additionalWhere: Record<string, unknown> = {}): Record<string, unknown> {
    const retailerId = this.getRetailerId();
    return {
      ...additionalWhere,
      retailerId,
    };
  }

  /**
   * Builds a Prisma where clause for alias queries strictly bound to this retailer.
   */
  public scopeAliasWhere(additionalWhere: Record<string, unknown> = {}): Record<string, unknown> {
    const retailerId = this.getRetailerId();
    return {
      ...additionalWhere,
      retailerId,
    };
  }

  /**
   * Asserts that a target retailer ID matches the authenticated session.
   * Throws if an IDOR attempt is detected.
   */
  public assertRetailerMatch(targetRetailerId: string): void {
    const authenticatedId = this.getRetailerId();
    if (authenticatedId !== targetRetailerId) {
      throw new Error(`IDOR_VIOLATION: Retailer ${authenticatedId} cannot access data for ${targetRetailerId}`);
    }
  }
}

