import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { useCart } from '../context/CartContext';

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const type = searchParams.get('type');
  const offerId = searchParams.get('offerId');

  // Clear cart if it was a cart checkout
  useEffect(() => {
    if (type === 'cart') {
      clearCart();
    }
  }, [type, clearCart]);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      
      <div className="pt-20 px-6 max-w-3xl mx-auto pb-12">
        <div className="bg-white rounded-xl p-12 text-center mt-10 shadow-sm">
          {/* Success Icon */}
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-12 h-12 text-green-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
          <p className="text-gray-600 text-lg mb-8">
            Thank you for your purchase. Your order has been confirmed and you'll receive a confirmation email shortly.
          </p>

          {/* Order Details */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">What happens next?</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold">1</div>
                <div>
                  <p className="font-medium text-gray-900">Order Confirmation</p>
                  <p className="text-sm text-gray-600">You'll receive an email with your order details</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold">2</div>
                <div>
                  <p className="font-medium text-gray-900">Seller Notification</p>
                  <p className="text-sm text-gray-600">The seller will be notified and prepare your books for shipping</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold">3</div>
                <div>
                  <p className="font-medium text-gray-900">Shipping</p>
                  <p className="text-sm text-gray-600">Your order will be shipped within 3-5 business days</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold">4</div>
                <div>
                  <p className="font-medium text-gray-900">Tracking</p>
                  <p className="text-sm text-gray-600">You'll receive tracking information once your order is shipped</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/profile"
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              View My Orders
            </Link>
            <Link
              to="/browse"
              className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Need help?{' '}
            <Link to="/chats" className="text-orange-500 hover:text-orange-600 font-medium">
              Contact the seller
            </Link>
            {' '}or{' '}
            <a href="mailto:support@betterreads.com" className="text-orange-500 hover:text-orange-600 font-medium">
              reach out to support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
