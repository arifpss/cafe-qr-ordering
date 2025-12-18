# Cafe QR Ordering Webapp

## Problem statement
Cafe customers scan a QR code at their table to order without waiting in line. Staff needs a live view of incoming orders, estimated times, and status updates. Admins need menu management, pricing control, discount rules, and reporting.

## User roles
- Customer: browse menu, place orders, track status, review served orders, view profile and history.
- Chef: see accepted orders, update preparing/ready statuses.
- Employee: accept orders, set ETA, mark served.
- Manager: everything employee can do plus admin controls and reporting.
- Admin: full access, settings, staff management, reports.

## Core flows
1. Scan QR -> `/t/:tableCode` -> register/login if needed.
2. Browse menu (EN/BN), add items, place order.
3. Staff receives in-app notifications via polling list.
4. Front desk accepts order, sets ETA.
5. Customer sees countdown, status changes.
6. Chef updates preparing/ready; front desk marks served.
7. Customer leaves rating (1-10) after served.

## Non-goals (for now)
- Online payment or POS integration.
- Multi-location UI (schema supports it).
- Advanced analytics beyond basic reporting endpoints.

## Glossary
- Badge: membership tier based on lifetime points.
- Points: 1 Tk spent = 1 point (applied when order served).
- ETA: estimated time of arrival in minutes.
- Theme: global visual skin (cyberpunk / windows11 / apple).
