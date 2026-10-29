// Ephemeral local demo: never connects to a configured production database.
process.env.JWT_SECRET = require('crypto').randomBytes(32).toString('hex');
process.env.STRIPE_SECRET_KEY = '';
process.env.STRIPE_WEBHOOK_SECRET = '';
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const http = require('http');
async function start() {
  const database = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: '7.0.24' },
  });
  await mongoose.connect(database.getUri());
  const User = require('./models/User'),
    Book = require('./models/Book');
  const seller = await User.create({
    name: 'The Demo Bookshelf',
    email: 'shelf@example.com',
    passwordHash: await bcrypt.hash('demo-reader-2026', 10),
    bio: 'A sample bookshelf for exploring BetterReads. These are demo listings.',
    city: 'Bengaluru',
  });
  await User.create({
    name: 'Demo Reader',
    email: 'reader@example.com',
    passwordHash: await bcrypt.hash('demo-reader-2026', 10),
    city: 'Delhi',
  });
  const examples = [
    ['The Midnight Library', 'Matt Haig', 'Fiction', 29900, 'Like New', true, 'midnight'],
    ['Atomic Habits', 'James Clear', 'Self-help', 34900, 'Used', false, 'atomic'],
    ['The Alchemist', 'Paulo Coelho', 'Fiction', 19900, 'Like New', true, 'alchemist'],
    ['Pride and Prejudice', 'Jane Austen', 'Classics', 14900, 'Used', true, 'pride'],
    ['The Hobbit', 'J. R. R. Tolkien', 'Fantasy', 27900, 'Like New', true, 'hobbit'],
    ['A Brief History of Time', 'Stephen Hawking', 'Science', 32900, 'Used', false, 'time'],
    ['The Secret Garden', 'Frances Hodgson Burnett', 'Classics', 17900, 'New', true, 'garden'],
    [
      'The Adventures of Sherlock Holmes',
      'Arthur Conan Doyle',
      'Mystery',
      22900,
      'Like New',
      true,
      'sherlock',
    ],
  ];
  await Book.insertMany(
    examples.map(([title, author, genre, priceCents, condition, barterAvailable, cover]) => ({
      ownerId: seller._id,
      title,
      author,
      genre,
      priceCents,
      condition,
      barterAvailable,
      currency: 'INR',
      location: { city: 'Bengaluru' },
      photos: ['/covers/' + cover + '.svg'],
      description:
        'Sample listing for the local demo. A lovely copy, ready for a new reader. Sign in to try wishlists, offers, chat, reviews, and your own listings.',
    })),
  );
  const app = require('./app'),
    server = http.createServer(app);
  app.set('io', require('./sockets').initSockets(server));
  const port = Number(process.env.PORT || 5000);
  server.listen(port, '127.0.0.1', () =>
    console.log(
      'DEMO API: http://localhost:' +
        port +
        ' — reader@example.com / demo-reader-2026. Data is temporary; Stripe payments are disabled.',
    ),
  );
  const stop = async () => {
    server.close();
    await mongoose.disconnect();
    await database.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
start().catch((error) => {
  console.error(error);
  process.exit(1);
});
