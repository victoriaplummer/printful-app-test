"use client";

import { useState, useEffect } from "react";
import WebflowSiteSelector from "@/components/WebflowSiteSelector";
import { useSession } from "next-auth/react";

interface WebflowSettingsProps {
  onSettingsChange?: (settings: WebflowSettingsData) => void;
  initialSettings?: Partial<WebflowSettingsData>;
}

export interface WebflowSettingsData {
  siteId: string;
  syncOptions: {
    autoDraft: boolean;
    includeImages: boolean;
    skipExisting: boolean;
  };
}

interface WebflowCollection {
  id: string;
  displayName: string;
}

export default function WebflowSettings({
  onSettingsChange,
  initialSettings,
}: WebflowSettingsProps) {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<WebflowSettingsData>({
    siteId: initialSettings?.siteId || "",
    syncOptions: {
      autoDraft: initialSettings?.syncOptions?.autoDraft ?? true,
      includeImages: initialSettings?.syncOptions?.includeImages ?? true,
      skipExisting: initialSettings?.syncOptions?.skipExisting ?? false,
    },
  });
  const [collections, setCollections] = useState<WebflowCollection[]>([]);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);

  const handleSiteChange = (siteId: string) => {
    const updatedSettings = {
      ...settings,
      siteId,
    };
    setSettings(updatedSettings);
    onSettingsChange?.(updatedSettings);
  };

  const handleToggleOption = (
    option: keyof WebflowSettingsData["syncOptions"]
  ) => {
    const updatedSettings = {
      ...settings,
      syncOptions: {
        ...settings.syncOptions,
        [option]: !settings.syncOptions[option],
      },
    };
    setSettings(updatedSettings);
    onSettingsChange?.(updatedSettings);
  };

  // Load collections when site ID changes
  const loadCollections = async (siteId: string) => {
    if (!siteId || !session?.webflowAccessToken) return;

    setIsLoadingCollections(true);

    try {
      const response = await fetch(
        `/api/webflow/collections?siteId=${siteId}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.error("Failed to load collections:", response.statusText);
        return;
      }

      const data = await response.json();
      setCollections(data.collections || []);
    } catch (error) {
      console.error("Error loading collections:", error);
    } finally {
      setIsLoadingCollections(false);
    }
  };

  // Load collections on initial render if we have a site ID
  useEffect(() => {
    if (settings.siteId) {
      loadCollections(settings.siteId);
    }
  }, []);

  if (!session?.webflowAccessToken) {
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
        <span>Please connect your Webflow account first</span>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Webflow Settings</h2>
        <p className="text-sm opacity-70 mb-3">
          Select the Webflow site where you want to sync your Printful products.
        </p>

        <WebflowSiteSelector
          onSiteSelect={handleSiteChange}
          selectedSiteId={settings.siteId}
        />

        {settings.siteId && (
          <>
            <div className="divider">Sync Options</div>

            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-4">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={settings.syncOptions.autoDraft}
                  onChange={() => handleToggleOption("autoDraft")}
                />
                <div>
                  <span className="label-text font-medium">Auto Draft</span>
                  <p className="text-xs opacity-70">
                    Create products as drafts instead of publishing immediately
                  </p>
                </div>
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-4">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={settings.syncOptions.includeImages}
                  onChange={() => handleToggleOption("includeImages")}
                />
                <div>
                  <span className="label-text font-medium">Include Images</span>
                  <p className="text-xs opacity-70">
                    Sync product images from Printful
                  </p>
                </div>
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-4">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={settings.syncOptions.skipExisting}
                  onChange={() => handleToggleOption("skipExisting")}
                />
                <div>
                  <span className="label-text font-medium">Skip Existing</span>
                  <p className="text-xs opacity-70">
                    Skip products that already exist in Webflow
                  </p>
                </div>
              </label>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
