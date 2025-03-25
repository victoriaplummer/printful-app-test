import React from "react";

interface ProductsFiltersProps {
  searchQuery: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
}

export const ProductsFilters: React.FC<ProductsFiltersProps> = ({
  searchQuery,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
}) => {
  return (
    <div className="mb-4 flex flex-col sm:flex-row justify-between gap-4">
      <div className="flex flex-wrap gap-2">
        <div>
          <label className="label text-xs">Status</label>
          <div className="btn-group space-x-1">
            <button
              className={`btn btn-xs ${
                statusFilter === "all" ? "btn-primary" : "btn-outline"
              }`}
              onClick={() => onStatusFilterChange("all")}
            >
              All
            </button>
            <button
              className={`btn btn-xs ${
                statusFilter === "synced" ? "btn-primary" : "btn-outline"
              }`}
              onClick={() => onStatusFilterChange("synced")}
            >
              Synced
            </button>
            <button
              className={`btn btn-xs ${
                statusFilter === "not_synced" ? "btn-primary" : "btn-outline"
              }`}
              onClick={() => onStatusFilterChange("not_synced")}
            >
              Not Synced
            </button>
            <button
              className={`btn btn-xs ${
                statusFilter === "error" ? "btn-primary" : "btn-outline"
              }`}
              onClick={() => onStatusFilterChange("error")}
            >
              Error
            </button>
          </div>
        </div>
      </div>

      <div className="form-control w-full sm:w-auto">
        <label className="label">
          <span className="label-text text-xs">Search</span>
        </label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name or ID..."
          className="input input-bordered input-sm w-full"
        />
      </div>
    </div>
  );
};
