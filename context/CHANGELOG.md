# Changelog

## 0.1.1
- Allow login with username or phone, and add usernames to user records
- Update default admin credentials to username `admin` and password `Admin123`
- Fix Cloudflare Pages Functions adapter for Hono routing

## 0.1.2
- Add table QR generator in admin dashboard
- Restrict customer profile to customers and add error handling
- Role-based redirect after login

## 0.1.3
- Add guest auth option and optional password on customer registration
- Front desk realtime alerts, countdown, and order/customer adjustments
- Customer ETA countdown with sound notification

## 0.1.4
- Add admin All Orders view and status filtering
- Update order statuses to RECEIVED/PREPARING/SERVING/SERVED/PAYMENT_RECEIVED
- Front desk dropdown status control with per-order countdown timers

## 0.1.5
- Add profile editing for all users with self-service updates
- Front desk shows only active orders; order history page supports editing
- Add order history access for admin/manager/employee

## 0.1.0
- Initial scaffold with customer, staff, and admin UI flows
- Hono API with auth, orders, menu, and reporting
- D1 schema migrations and seed data
- Cloudflare deployment scripts and GitHub Actions workflow
