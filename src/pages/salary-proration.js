import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useEffect, useRef } from "react";

export default function SalaryProration() {
  const iframeRef = useRef(null);

  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data?.type === "iframeHeight" && iframeRef.current) {
        iframeRef.current.style.height = e.data.height + "px";
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
        <meta property="og:url" content="https://payrolltool.in/salary-proration" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://payrolltool.in/salary-proration" />
      </Head>

      <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#EEEAF8" }}>
        <Header />

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

        <Footer />
      </div>
    </>
  );
}