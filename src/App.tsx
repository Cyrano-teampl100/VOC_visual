import { BrowserRouter, Routes, Route } from "react-router-dom";
import ChartTestPage from "./page/ChartTestPage";

function App() {
  return (
    <BrowserRouter>
      <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        <header style={{ padding: 16, backgroundColor: "#f0f0f0", textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: "bold" }}>VOC 분석 시각화</h1>
        </header>

        <main
          style={{
            width: "100%",
            padding: 24,
            height: "100%",
            margin: "0 auto", // ✅ 여기 추가!
          }}
        >
          <Routes>
            <Route path="/*" element={<ChartTestPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
