// Update this page (the content is just a fallback if you fail to update the page)

import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

const Index = () => {
  const navigate = useNavigate();
  const [health, setHealth] = useState<string | null>(null);

  async function checkHealth() {
    try {
      const res = await fetch(import.meta.env.VITE_API_BASE ? import.meta.env.VITE_API_BASE + '/api/health' : '/api/health');
      const json = await res.json();
      setHealth(JSON.stringify(json));
    } catch (e: any) {
      setHealth(String(e?.message || e));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center max-w-xl">
        <h1 className="mb-4 text-4xl font-bold">Techfy Demand Dashboard</h1>
        <p className="text-xl text-muted-foreground">Quick links to your app pages — click to open a page.</p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button className="btn" onClick={() => navigate('/overview')}>Overview</button>
          <Link to="/live-trends" className="btn">Live Trends</Link>
          <Link to="/demand-forecast" className="btn">Demand Forecast</Link>
        </div>

        <div className="mt-6">
          <button className="btn" onClick={checkHealth}>Check API Health</button>
          {health && <pre className="mt-3 text-left rounded-md bg-muted p-3 text-sm">{health}</pre>}
        </div>

        <p className="text-sm text-muted-foreground mt-6">If pages still show blank, open DevTools (F12) and check Console for errors. The app includes error overlays to help.</p>
      </div>
    </div>
  );
};

export default Index;
