import React from 'react';

const categories = [
  {
    title: 'Fiction & Fantasy',
    items: [
      { icon: '🔍', label: 'Mystery & Thriller' },
      { icon: '🚀', label: 'Science Fiction & Fantasy' },
      { icon: '❤', label: 'Romance' },
      { icon: '🧑‍🎓', label: 'Young Adult' },
      { icon: '📚', label: 'Graphic Novels' },
      { icon: '📜', label: 'Classic Literature' },
    ],
  },
  {
    title: 'Non-Fiction & Philosophy',
    items: [
      { icon: '⏳', label: 'History' },
      { icon: '👤', label: 'Biography' },
      { icon: '👶', label: "Children's" },
      { icon: '🏛️', label: 'Philosophy' },
      { icon: '🧠', label: 'Self Help' },
      { icon: '🧘', label: 'Religion & Spirituality' },
    ],
  },
  {
    title: 'Specialty & More',
    items: [
      { icon: '🪶', label: 'Poetry' },
      { icon: '⭐', label: 'Advanced' },
      { icon: '🍴', label: 'Cookbooks' },
      { icon: '📷', label: 'Art & Photography' },
      { icon: '🌐', label: 'Travel' },
    ],
  },
];

const CategoryDropdown = ({ open }) => {
  if (!open) return null;
  return (
    <div className="absolute left-1/2 -translate-x-1/2 mt-4 bg-white rounded-2xl shadow-2xl p-12 flex gap-16 z-50 min-w-[700px]">
      {categories.map((cat) => (
        <div key={cat.title}>
          <h3 className="text-xl font-semibold mb-6 text-gray-900">{cat.title}</h3>
          <ul className="space-y-4">
            {cat.items.map((item) => (
              <li key={item.label} className="flex items-center gap-3 text-lg text-gray-700">
                <span className="text-2xl">{item.icon}</span>
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default CategoryDropdown;
