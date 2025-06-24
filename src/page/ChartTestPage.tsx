import rawData from "../../exported_data.json";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from "recharts";

// 월별 라벨 집계 함수
function groupByMonthAndLabel(data: any[]) {
  const stats: Record<string, Record<string, number>> = {};

  data.forEach(row => {
    const month = dayjs(row.date).format("YYYY-MM");
    const labels = row.label.split(",").map(l => l.trim());
    if (!stats[month]) stats[month] = {};
    labels.forEach(label => {
      if (!stats[month][label]) stats[month][label] = 0;
      stats[month][label] += 1;
    });
  });

  return Object.entries(stats).map(([month, labelMap]) => ({
    month,
    ...labelMap,
  }));
}

// 커스텀 툴팁
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: "white", border: "1px solid #ccc", padding: 4, fontSize: 10 }}>
        <div><strong>{label || payload[0].payload.month}</strong></div>
        {payload.map((entry: any) => (
          <div key={entry.dataKey}>
            {entry.dataKey}: {entry.value}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ChartTestPage() {
  const [chartData, setChartData] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("전체");

  useEffect(() => {
    setChartData(groupByMonthAndLabel(rawData));
  }, []);

  const allLabels = Array.from(
    new Set(chartData.flatMap(d => Object.keys(d).filter(k => k !== "month")))
  );

  const months = chartData.map(d => d.month).sort();

  const filteredData =
    selectedMonth === "전체"
      ? chartData
      : chartData.filter(d => d.month === selectedMonth);

  const isSingleMonth = selectedMonth !== "전체";

  // 총 VOC 개수 계산
  const totalVOC = filteredData.reduce((sum, row) => {
    const totalInRow = Object.entries(row)
      .filter(([key]) => key !== "month")
      .reduce((acc, [, val]) => acc + (val as number), 0);
    return sum + totalInRow;
  }, 0);

  const title =
    selectedMonth === "전체"
      ? `전체 VOC (${totalVOC}건)`
      : `${selectedMonth} VOC (${totalVOC}건)`;

  return (
    <div style={{ maxWidth: 1000, margin: "auto", padding: 20, textAlign: "center", userSelect: "none" }}>
      {/* 월 선택 상태 */}
      <div style={{ marginBottom: 12, fontWeight: "bold" }}>
        현재 선택된 기간: {selectedMonth}
      </div>

      {/* 선택 버튼 */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => setSelectedMonth("전체")}
          style={{
            margin: 4,
            padding: "6px 12px",
            backgroundColor: selectedMonth === "전체" ? "#007bff" : "#ddd",
            color: selectedMonth === "전체" ? "#fff" : "#000",
            border: "none",
            borderRadius: 4,
            cursor: "pointer"
          }}
        >
          전체
        </button>
        {months.map(month => (
          <button
            key={month}
            onClick={() => setSelectedMonth(month)}
            style={{
              margin: 4,
              padding: "6px 12px",
              backgroundColor: selectedMonth === month ? "#007bff" : "#ddd",
              color: selectedMonth === month ? "#fff" : "#000",
              border: "none",
              borderRadius: 4,
              cursor: "pointer"
            }}
          >
            {month}
          </button>
        ))}
      </div>

      {/* 차트 제목 */}
      <h3 style={{ marginBottom: 10 }}>{title}</h3>

      <ResponsiveContainer width="100%" height={600}>
        <BarChart
          data={filteredData}
          margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
        >
          <XAxis dataKey={isSingleMonth ? "month" : "month"} />
          <YAxis allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend layout="vertical" verticalAlign="middle" align="right" />
          {allLabels.map((label, idx) => (
            <Bar
              key={label}
              dataKey={label}
              stackId={isSingleMonth ? undefined : "a"}
              fill={`hsl(${(idx * 47) % 360}, 70%, 60%)`}
              maxBarSize={isSingleMonth ? 60 : undefined}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
