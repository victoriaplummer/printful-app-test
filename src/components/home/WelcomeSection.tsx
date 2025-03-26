export default function WelcomeSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Introduction */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Welcome</h2>
          <p>
            This utility allows you to synchronize your Printful products with
            your Webflow store. Connect both services to get started.
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Key Features</h2>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Sync all Printful products to Webflow</li>
            <li>Manage individual product variants</li>
            <li>Track sync status for each product</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
