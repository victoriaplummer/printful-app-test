"use client";

import { useEffect, useState } from "react";

interface WebflowSite {
  id: string;
  name: string;
  domains?: string[];
}

interface WebflowSiteSelectorProps {
  onSiteSelect: (siteId: string) => void;
  selectedSiteId?: string | null;
}

export default function WebflowSiteSelector({
  onSiteSelect,
  selectedSiteId,
}: WebflowSiteSelectorProps) {
  const [sites, setSites] = useState<WebflowSite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSites() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/webflow/sites");
        if (!response.ok) {
          throw new Error(
            `Failed to fetch sites: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        setSites(data.sites || []);

        // Only auto-select if there's exactly one site and no site is already selected
        if (data.sites?.length === 1 && !selectedSiteId) {
          onSiteSelect(data.sites[0].id);
        }
      } catch (err) {
        console.error("Error fetching Webflow sites:", err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    }

    fetchSites();
  }, [onSiteSelect, selectedSiteId]);

  const handleSiteChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const siteId = event.target.value;
    if (siteId) {
      onSiteSelect(siteId);
    }
  };

  if (isLoading) {
    return (
      <div className="alert alert-info">
        <span className="loading loading-spinner loading-sm"></span>
        <span>Loading Webflow sites...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="stroke-current shrink-0 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>Error: {error}</span>
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="alert alert-warning">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="stroke-current shrink-0 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span>
          No Webflow sites found. Please create a site in Webflow first.
        </span>
      </div>
    );
  }

  return (
    <div className="form-control mb-4">
      <label className="label" htmlFor="webflow-site-selector">
        <span className="label-text">Select Webflow Site</span>
      </label>
      <select
        id="webflow-site-selector"
        className="select select-bordered bg-base-300 w-full focus:outline-primary text-base-content"
        value={selectedSiteId || ""}
        onChange={handleSiteChange}
      >
        <option value="" disabled>
          {sites.length > 1 ? "Select a Webflow site" : ""}
        </option>
        {sites.map((site) => (
          <option key={site.id} value={site.id} className="text-base-content">
            {site.name}
          </option>
        ))}
      </select>
    </div>
  );
}
