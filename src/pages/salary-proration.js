import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useEffect, useRef } from "react";
import FeedbackWidget from "../components/FeedbackWidget";

export default function SalaryProration() {
  const iframeRef = useRef(null);

  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data?.type === "iframeHeight" && iframeRef.current) {
        iframeRef.current.style.height = e.data.height + "px";
      }
      if (e.data?.type === "toolDownloadCompleted") {
        if (typeof window !== "undefined" && window.gtag) {
          window.gtag("event", "tool_download_completed", {
            tool_name: e.data.tool,
            file_type: e.data.fileType,
          });
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <>
      <Head>
        <title>Salary Proration Calculator – PayrollTool</title>
        <meta name="description" content="Calculate precise prorated salary for partial months, mid-month joining or exit. EPF, ESI, PT, LWF, NPS, TDS included." />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="Salary Proration Calculator – PayrollTool" />
        <meta property="og:url" content="https://www.payrolltool.in/salary-proration" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://www.payrolltool.in/salary-proration" />
      </Head>

      <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#EEEAF8" }}>
        <Header />

        <div className="max-w-3xl mx-auto px-4 pt-10 pb-6 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
            Salary Proration Calculator
          </h1>
          <p className="text-gray-500 mt-3 leading-relaxed">
            Calculate accurate prorated salary for mid-month joiners, exits, or any partial-month
            payroll cycle. Handles EPF, ESI, Professional Tax, LWF, NPS, and TDS adjustments
            automatically, based on FY 2026-27 statutory rules — free, browser-based, no signup
            required.
          </p>
        </div>

        <iframe
          ref={iframeRef}
          src="/salary-proration-tool.html"
          scrolling="no"
          style={{
            width: "100%",
            height: "800px",
            border: "none",
            display: "block",
            overflow: "hidden",
          }}
          title="Salary Proration Calculator"
        />

        <div className="max-w-3xl mx-auto px-4 py-10 text-sm text-gray-500 leading-relaxed">
          <h2 className="text-lg font-bold text-gray-800 mb-2">How salary proration works</h2>
          <p>
            When an employee joins or leaves mid-month, their salary and statutory contributions
            need to be calculated only for the days actually worked in that period — not the full
            month. This tool prorates Basic, HRA, and other salary components based on calendar
            days, then recalculates EPF, ESI, PT, LWF, NPS, and TDS on the prorated wage figures,
            so your payroll stays statutorily compliant without manual spreadsheet formulas.
          </p>
        </div>

        <div className="max-w-3xl mx-auto px-4">
          <FeedbackWidget toolName="Salary Proration" />
        </div>

        <Footer />
      </div>
    </>
  );
}