# Financial Tracking Enhancement Plan

## Objective
To actively track and summarize the financial metrics of the platform, specifically focusing on Total Transaction Value (Gross Merchandise Value - GMV) and Lbricol.ma's Revenue (derived from service fees). 

## Phase 1: Ensure Financial Data Persistence
- **Task**: Update the Firestore Order schema to guarantee that `basePrice`, `serviceFee` (Lbricol Revenue), and `totalPrice` (GMV) are always calculated and saved reliably on every order submission.
- **Target**: `OrderSubmissionFlow.tsx`

## Phase 2: Create the Admin Dashboard (Financial Section)
- **Task**: To make these numbers visible to you, we need to build or extend a secure Admin view that aggregates all `done` or `completed` orders and sums up the `totalPrice` and `serviceFee` fields.
- **Target**: Ensure `serviceFee` metric tracking is added to the Admin Interface (likely related to previous Conversation #6383e304 "Admin Interface Development" if it already exists, or creating a new aggregator component).

## Phase 3: Enhance Provider Dashboard Financials (Optional but related)
- **Task**: Ensure the Bricoler's view accurately reflects *their* cut (Base Price) vs what the client pays to keep the ecosystem transparent and ensure their revenue tracking is accurate.
