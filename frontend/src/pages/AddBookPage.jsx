import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/NavBar'
import Footer from '../components/Footer'
import { booksAPI, uploadAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

// --- CONSTANTS ---
const STEPS = [
  { id: 1, label: 'Details' },
  { id: 2, label: 'Preferences' },
  { id: 3, label: 'Photos' }
]

const CONDITIONS = ['New', 'Like New', 'Used']
// Sync genres with CategoryDropdown.jsx
const GENRES = [
  'Classic Literature',
  'Mystery',
  'Thriller',
  'Fantasy',
  'Self Help',
  'Other',
];

const AddBookPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  // --- STATE ---
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '', author: '', isbn: '', condition: 'Good',
    barterAvailable: true, priceCents: 0, description: '',
    genre: '', customGenre: '', city: user?.city || '', photos: []
  })

  // --- HANDLERS ---
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    // Reset customGenre if genre changes away from 'Other'
    if (name === 'genre' && value !== 'Other') {
      setFormData(prev => ({ ...prev, customGenre: '' }));
    }
  }

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;

    setUploadingImages(true);
    try {
      const uploadedPhotos = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Read file as base64
        const reader = new FileReader();
        const fileRead = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        // Upload to server
        const res = await uploadAPI.single(fileRead, 'betterreads/books');
        uploadedPhotos.push(res.data.url);
      }
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, ...uploadedPhotos].slice(0, 5), // max 5
      }));
    } catch (err) {
      console.error('Image upload failed', err);
      // Optionally show error to user
    } finally {
      setUploadingImages(false);
    }
  }

  const removeImage = (idx) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== idx)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Use customGenre if 'Other' is selected
      const submitData = {
        ...formData,
        genre: formData.genre === 'Other' ? formData.customGenre : formData.genre,
      };
      await booksAPI.create(submitData)
      navigate('/books')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // --- RENDER STEPS ---
  
  // Step 1: Basic Info (Reconstructed based on your context)
  const renderStep1 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputGroup label="Book Title" name="title" value={formData.title} onChange={handleChange} placeholder="e.g. The Great Gatsby" />
        <InputGroup label="Author" name="author" value={formData.author} onChange={handleChange} placeholder="e.g. F. Scott Fitzgerald" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Genre</label>
          <select
            name="genre"
            value={formData.genre}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
          >
            <option value="">Select Genre</option>
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          {formData.genre === 'Other' && (
            <input
              type="text"
              name="customGenre"
              value={formData.customGenre}
              onChange={handleChange}
              className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              placeholder="Enter your genre"
            />
          )}
        </div>
        <InputGroup label="ISBN (Optional)" name="isbn" value={formData.isbn} onChange={handleChange} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
        <textarea 
          name="description" 
          rows="4" 
          value={formData.description} 
          onChange={handleChange}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
          placeholder="Tell us about the book..."
        />
      </div>

      <div className="flex justify-end pt-4">
        <button type="button" onClick={() => setStep(2)} className="btn-primary">
          Next Step
        </button>
      </div>
    </div>
  )

  // Step 2: Preferences (Reconstructed)
  const renderStep2 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Condition</label>
        <div className="flex gap-4">
          {CONDITIONS.map(c => (
            <label key={c} className={`flex-1 cursor-pointer border rounded-xl p-4 text-center transition-all ${formData.condition === c ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="condition" value={c} checked={formData.condition === c} onChange={handleChange} className="sr-only" />
              <span className="font-medium">{c}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl">
        <input 
          type="checkbox" 
          name="barterAvailable" 
          id="barter"
          checked={formData.barterAvailable} 
          onChange={handleChange}
          className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500" 
        />
        <label htmlFor="barter" className="cursor-pointer select-none">
          <span className="block font-medium text-gray-900">Open to Barter?</span>
          <span className="text-sm text-gray-500">Allow others to offer books in exchange</span>
        </label>
      </div>

      <div className="flex justify-between pt-6">
        <button type="button" onClick={() => setStep(1)} className="btn-secondary">Back</button>
        <button type="button" onClick={() => setStep(3)} className="btn-primary">Next Step</button>
      </div>
    </div>
  )

  // Step 3: Images (Your provided code, cleaned)
  const renderStep3 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="border-2 border-dashed border-stone-300 rounded-2xl p-8 hover:bg-stone-50 transition-colors text-center">
        <input
          type="file"
          id="photo-upload"
          className="hidden"
          multiple
          accept="image/*"
          onChange={handleImageUpload}
          disabled={uploadingImages}
        />
        <label htmlFor="photo-upload" className="cursor-pointer block w-full h-full">
          {uploadingImages ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mb-4"></div>
              <p className="text-gray-500">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4 text-stone-400">
                 {/* Icons extracted for cleaner JSX */}
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <p className="text-gray-900 font-medium mb-1">Click to upload photos</p>
              <p className="text-stone-500 text-sm">PNG, JPG up to 10MB (Max 5)</p>
            </div>
          )}
        </label>
      </div>

      {formData.photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
          {formData.photos.map((photo, idx) => (
            <div key={idx} className="relative aspect-[3/4] rounded-lg overflow-hidden group">
              <img src={photo} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between pt-6">
        <button type="button" onClick={() => setStep(2)} className="btn-secondary">Back</button>
        <button 
          type="submit" 
          disabled={loading}
          className="btn-primary w-48 flex justify-center"
        >
          {loading ? <div className="animate-spin w-5 h-5 border-2 border-stone-900 border-t-transparent rounded-full" /> : 'Create Listing'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <div className="pt-24 pb-12 px-4 md:px-8 grow">
        <div className="max-w-3xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-serif">
              List a Book
            </h1>
            <p className="text-gray-500">Share your books with the community</p>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center justify-center mb-12">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors
                  ${step >= s.id ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {s.id}
                </div>
                {i !== STEPS.length - 1 && (
                  <div className={`w-12 h-1 mx-2 ${step > s.id ? 'bg-amber-500' : 'bg-gray-100'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="bg-white">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </form>

        </div>
      </div>
      <Footer />
      
      {/* Utility Styles for Buttons (Add to index.css or keep as class names) */}
      <style>{`
        .btn-primary {
          @apply px-8 py-3 bg-[#f7941d] hover:bg-[#e8850f] text-gray-900 font-semibold rounded-xl transition-colors disabled:opacity-50;
        }
        .btn-secondary {
          @apply px-8 py-3 bg-stone-100 hover:bg-stone-200 text-gray-900 font-medium rounded-xl transition-colors;
        }
      `}</style>
    </div>
  )
}

// Simple Helper Component to reduce repetition
const InputGroup = ({ label, name, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    <input 
      name={name}
      {...props}
      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
    />
  </div>
)

export default AddBookPage