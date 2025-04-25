# RentoRide

A car rental application that allows providers to list vehicles and customers to rent them.

## Features

- **User Management**: Role-based authentication (providers and customers)
- **Vehicle Management**: List and search vehicles by city
- **Booking System**: Make bookings with date ranges
- **Payment Processing**: Integrated with Stripe (optional in development)
- **Review System**: Rate and comment on bookings

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Express.js, TypeScript
- **Database**: In-memory storage (can be replaced with PostgreSQL)
- **Authentication**: Passport.js

## Getting Started

1. Clone the repository
```bash
git clone https://github.com/abhishekreddykalekurthi/rentoride.git
cd rentoride
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

4. Visit http://localhost:5000 in your browser

## API Endpoints

- `/api/register` - Register a new user
- `/api/login` - Log in a user
- `/api/vehicles` - Create and get vehicle listings
- `/api/bookings` - Manage bookings
- `/api/wallet` - Handle wallet operations
- `/api/reviews` - Manage reviews

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change. 