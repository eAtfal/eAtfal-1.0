function DeleteConfirmationModal({ isOpen, onClose, onConfirm, title, message, isLoading }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md z-10 overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <div className="p-6">
          <p className="text-gray-700">{message}</p>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-100 text-gray-700" disabled={isLoading}>Cancel</button>
            <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-red-600 text-white font-semibold" disabled={isLoading}>
              {isLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DeleteConfirmationModal
