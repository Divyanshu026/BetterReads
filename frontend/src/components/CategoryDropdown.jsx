import React from 'react';
import styles from './CategoryDropdown.module.css';

const columns = [
  {
    heading: 'GENRES',
    items: ['Classic Literature', 'Mystery', 'Thriller', 'Fantasy', 'Self Help'],
  },

];

const rightSection = {
  heading: 'SUGGESTIONS',
  boxes: [
    {
      title: 'Category Not Found?',
      desc: 'Suggest a new one!',
    },
    {
      title: 'Contact Us',
      desc: 'Reach out for support or feedback.',
    },
  ],
};

const CategoryDropdown = ({ open }) => {
  if (!open) return null;
  return (
    <div className={styles['br-dropdown-root']}>
      <div className={styles['br-dropdown-content']}>
        <div className={styles['br-dropdown-columns']}>
          {columns.map((col) => (
            <div key={col.heading} className={styles['br-dropdown-col']}>
              <h3 className={styles['br-dropdown-heading']}>{col.heading}</h3>
              <ul className={styles['br-dropdown-list']}>
                {col.items.map((item) => (
                  <li key={item} className={styles['br-dropdown-item']}>
                    <span className={styles['br-dropdown-label']}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className={styles['br-dropdown-divider']} />
        <div className={styles['br-dropdown-right']}>
          <h3 className={styles['br-dropdown-right-heading']}>{rightSection.heading}</h3>
          {rightSection.boxes.map((box) => (
            <div key={box.title} className={styles['br-dropdown-pro-box']}>
              <div className={styles['br-dropdown-pro-title']}>{box.title}</div>
              <div className={styles['br-dropdown-pro-desc']}>{box.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryDropdown;
