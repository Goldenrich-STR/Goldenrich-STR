import React, { useCallback, useState } from "react";
import HostWorkspaceShell from "../components/HostWorkspaceShell";
import PriceEngine from "../components/channel-manager/PriceEngine";

const HostPricing = () => {
  const [notice, setNotice] = useState(null);

  const notify = useCallback((message, type = "success") => {
    setNotice({ message, type });
    window.setTimeout(() => setNotice(null), 4000);
  }, []);

  return (
    <HostWorkspaceShell
      activePath="/host/pricing"
      sidebarTitle="Pricing"
      sidebarDescription="Property-wise weekend and seasonal pricing for your Villas and Homestays."
      showHero={false}
    >
      {notice ? (
        <div
          className={`fixed right-5 top-20 z-[1100] max-w-sm rounded-xl border px-4 py-3 text-sm font-bold shadow-xl ${
            notice.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {notice.message}
        </div>
      ) : null}
      <div className="host-price-engine">
        <PriceEngine notify={notify} />
      </div>
    </HostWorkspaceShell>
  );
};

export default HostPricing;
