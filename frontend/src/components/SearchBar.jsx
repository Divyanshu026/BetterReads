import { useState } from 'react'

const SearchBar = () => {
  const [location, setLocation] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    // Handle search - will be implemented later
    console.log('Searching for books in:', location)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="flex items-center bg-white rounded-lg shadow-xl overflow-hidden">
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Enter your zip code or city..."
          className="flex-1 px-6 py-4 text-gray-700 text-lg outline-none placeholder-gray-400"
        />
        <button
          type="submit"
          className="flex items-center gap-2 px-8 py-4 bg-[#8B5A2B] hover:bg-[#6B4423] text-white font-semibold text-lg transition-colors duration-200 cursor-pointer"
        >
          <svg fill="currentColor" height="22" viewBox="0 0 22 22" width="22" xmlns="http://www.w3.org/2000/svg" className="">
            <path clipRule="evenodd" d="M14.192 15.606a7 7 0 111.414-1.414l3.601 3.601-1.414 1.414-3.6-3.6zM15 10a5 5 0 11-10 0 5 5 0 0110 0z" fillRule="evenodd"></path>
          </svg>
          Find Books
        </button>
      </div>
    </form>
  )
}

export default SearchBar
