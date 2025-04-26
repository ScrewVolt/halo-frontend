export default function Offline() {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-center p-6 bg-gray-100">
        <h1 className="text-3xl font-bold text-blue-700 mb-4">You're Offline</h1>
        <p className="text-gray-600 text-lg mb-6">
          It looks like your device lost connection.
        </p>
        <p className="text-gray-500 text-sm">
          Don't worry! Your work will automatically sync once you’re back online.
        </p>
      </div>
    );
  }
  