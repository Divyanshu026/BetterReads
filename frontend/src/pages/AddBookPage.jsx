import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { booksAPI, uploadAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

const AddBookPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    condition: 'Good',
    barterAvailable: true,
    priceCents: 0,
    description: '',
    genre: '',
    city: user?.city || '',
    photos: []
  })

  const conditions = ['New', 'Like New', 'Used']
  const genres = ['Fiction', 'Non-Fiction', 'Mystery', 'Sci-Fi', 'Romance', 'Biography', 'Self-Help', 'History', 'Fantasy', 'Horror', 'Classic Literature', 'Other']

  const handleInputChange = (e) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }))
  }

  // Handle image upload
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    if (formData.photos.length + files.length > 5) {
      alert('Maximum 5 images allowed')
      return
    }

    setUploadingImages(true)
    
    try {
      // Convert files to base64
      const base64Images = await Promise.all(
        files.map(file => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
        })
      )

      // Upload to Cloudinary
      const response = await uploadAPI.multiple(base64Images, 'betterreads/books')
      const uploadedUrls = response.data.images.map(img => img.url)

      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, ...uploadedUrls]
      }))
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload images')
    } finally {
      setUploadingImages(false)
    }
  }

  // Remove image
  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const bookData = {
        ...formData,
        priceCents: Math.round(formData.priceCents * 100) // Convert dollars to cents
      }

      await booksAPI.create(bookData)
      navigate('/profile')
    } catch (error) {
      console.error('Create book error:', error)
      alert(error.response?.data?.error?.message || 'Failed to create book listing')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      
      <div className="pt-24 pb-12 px-8 flex-grow">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              List a Book
            </h1>
            <p className="text-gray-500">Share your books with the community</p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-12">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors ${
                  step >= s ? 'bg-[#f7941d] text-gray-900' : 'bg-gray-100 text-gray-400'
                }`}>
                  {s}
                </div>
                {s < 3 && (
                  <div className={`w-20 h-1 transition-colors ${
                    step > s ? 'bg-[#f7941d]' : 'bg-gray-100'
                  }`}></div>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Step 1: Book Details */}
            {step === 1 && (
              <div className="bg-white rounded-2xl p-8 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Book Details</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">Book Title *</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="e.g., The Great Gatsby"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#f7941d] transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">Author *</label>
                    <input
                      type="text"
                      name="author"
                      value={formData.author}
                      onChange={handleInputChange}
                      placeholder="e.g., F. Scott Fitzgerald"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#f7941d] transition-colors"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">ISBN (Optional)</label>
                      <input
                        type="text"
                        name="isbn"
                        value={formData.isbn}
                        onChange={handleInputChange}
                        placeholder="978-0-00-000000-0"
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#f7941d] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Genre *</label>
                      <select
                        name="genre"
                        value={formData.genre}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-[#f7941d] transition-colors"
                        required
                      >
                        <option value="">Select genre</option>
                        {genres.map(genre => (
                          <option key={genre} value={genre}>{genre}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Tell potential traders about this book..."
                      rows={4}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#f7941d] transition-colors resize-none"
                    ></textarea>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!formData.title || !formData.author || !formData.genre}
                    className="px-8 py-3 bg-[#f7941d] hover:bg-[#e8850f] text-gray-900 font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Condition & Trade */}
            {step === 2 && (
              <div className="bg-white rounded-2xl p-8 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Condition & Trade Preferences</h2>
                
                <div className="space-y-8">
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-4">Book Condition *</label>
                    <div className="grid grid-cols-3 gap-3">
                      {conditions.map(condition => (
                        <button
                          key={condition}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, condition }))}
                          className={`px-4 py-3 rounded-xl font-medium transition-all ${
                            formData.condition === condition
                              ? 'bg-[#f7941d] text-gray-900'
                              : 'bg-white text-gray-500 border border-gray-200 hover:border-stone-600'
                          }`}
                        >
                          {condition}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-4">Available for Trade?</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, barterAvailable: true }))}
                        className={`px-4 py-3 rounded-xl font-medium transition-all ${
                          formData.barterAvailable
                            ? 'bg-[#f7941d] text-gray-900'
                            : 'bg-white text-gray-500 border border-gray-200 hover:border-stone-600'
                        }`}
                      >
                        Yes, open to trades
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, barterAvailable: false }))}
                        className={`px-4 py-3 rounded-xl font-medium transition-all ${
                          !formData.barterAvailable
                            ? 'bg-[#f7941d] text-gray-900'
                            : 'bg-white text-gray-500 border border-gray-200 hover:border-stone-600'
                        }`}
                      >
                        No, sell only
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">Price (USD) - Optional</label>
                    <input
                      type="number"
                      name="priceCents"
                      value={formData.priceCents}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#f7941d] transition-colors"
                    />
                    <p className="text-gray-400 text-sm mt-1">Leave at 0 for free</p>
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">Your City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="e.g., New York"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#f7941d] transition-colors"
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-8 py-3 bg-stone-700 hover:bg-stone-600 text-gray-900 font-medium rounded-xl transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-8 py-3 bg-[#f7941d] hover:bg-[#e8850f] text-gray-900 font-semibold rounded-xl transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Photos */}
            {step === 3 && (
              <div className="bg-white rounded-2xl p-8 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Add Photos</h2>
                
                <div className="space-y-6">
                  {/* Upload Area */}
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-stone-600 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      id="photo-upload"
                      disabled={uploadingImages}
                    />
                    <label htmlFor="photo-upload" className="cursor-pointer">
                      {uploadingImages ? (
                        <div className="flex flex-col items-center">
                          <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mb-4"></div>
                          <p className="text-gray-500">Uploading...</p>
                        </div>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto text-gray-400 mb-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                          </svg>
                          <p className="text-gray-500 mb-2">Click to upload photos</p>
                          <p className="text-stone-600 text-sm">PNG, JPG up to 10MB (max 5 images)</p>
                        </>
                      )}
                    </label>
                  </div>

                  {/* Preview */}
                  {formData.photos.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                      {formData.photos.map((photo, idx) => (
                        <div key={idx} className="relative aspect-3/4 rounded-lg overflow-hidden">
                          <img src={photo} alt={`Book ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center text-gray-900 text-sm"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-8 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-8 py-3 bg-stone-700 hover:bg-stone-600 text-gray-900 font-medium rounded-xl transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3 bg-[#f7941d] hover:bg-[#e8850f] text-gray-900 font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading && <div className="animate-spin w-4 h-4 border-2 border-stone-900 border-t-transparent rounded-full"></div>}
                    {loading ? 'Creating...' : 'Create Listing'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default AddBookPage
