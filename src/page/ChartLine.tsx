import rawData from "../../exported_data.json";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// 📌 모든 라벨 미리 수집
const extractAllLabels = (data: any[]) => {
  const set = new Set<string>();
  data.forEach((row) => {
    if (typeof row.label === "string" && row.label.trim() !== "") {
      row.label.split(",").map((l) => set.add(l.trim()));
    }
  });
  return Array.from(set).sort(); // 알파벳 순 정렬
};

// 📊 월별 라벨 집계
function groupByMonthAndLabel(data: any[], allLabels: string[]) {
  const stats: Record<string, Record<string, number>> = {};

  data.forEach((row) => {
    const date = dayjs(row.latestUserDate);
    if (!date.isValid()) return;

    const month = date.format("YYYY-MM");
    if (!stats[month]) stats[month] = {};

    const labels = row.label?.split(",").map((l: string) => l.trim()) || [];
    labels.forEach((label) => {
      if (!stats[month][label]) stats[month][label] = 0;
      stats[month][label] += 1;
    });
  });

  return Object.entries(stats).map(([month, labelMap]) => {
    const filled: Record<string, number | string> = { month };
    allLabels.forEach((label) => {
      filled[label] = labelMap[label] || 0;
    });
    return filled;
  }).sort((a, b) => dayjs(a.month as string).unix() - dayjs(b.month as string).unix());
}

// 📊 일별 라벨 집계
function groupByDayAndLabelWithFill(data: any[], targetMonth: string, allLabels: string[]) {
  const stats: Record<string, Record<string, number>> = {};

  data
    .filter((row) => dayjs(row.latestUserDate).format("YYYY-MM") === targetMonth)
    .forEach((row) => {
      const day = dayjs(row.latestUserDate).format("YYYY-MM-DD");
      const labels = row.label?.split(",").map((l: string) => l.trim()) || [];

      if (!stats[day]) stats[day] = {};

      labels.forEach((label) => {
        if (!stats[day][label]) stats[day][label] = 0;
        stats[day][label] += 1;
      });
    });

  const start = dayjs(targetMonth + "-01");
  const end = start.endOf("month");
  const allDays: string[] = [];

  for (let date = start; date.isSame(end) || date.isBefore(end); date = date.add(1, "day")) {
    allDays.push(date.format("YYYY-MM-DD"));
  }

  return allDays.map((day) => {
    const labelCounts = stats[day] || {};
    const dayData: Record<string, number | string> = { day };
    allLabels.forEach((label) => {
      dayData[label] = labelCounts[label] || 0;
    });
    return dayData;
  });
}

// 툴팁 컴포넌트
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: "#fff", border: "1px solid #ccc", padding: 6 }}>
        <div><strong>{label}</strong></div>
        {payload.map((entry: any) => (
          <div key={entry.dataKey} style={{ color: entry.color }}>
            {entry.dataKey}: {entry.value}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ChartLine() {
  const allLabels = extractAllLabels(rawData);
  const [selectedMonth, setSelectedMonth] = useState<string>("전체");
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  useEffect(() => {
    setMonthlyData(groupByMonthAndLabel(rawData, allLabels));
  }, []);

  useEffect(() => {
      // 월이 바뀌면 체크박스도 초기화
     setSelectedLabels([]);

    if (selectedMonth !== "전체") {
      const filled = groupByDayAndLabelWithFill(rawData, selectedMonth, allLabels);
      setDailyData(filled);
    }
  }, [selectedMonth]);

  const months = monthlyData.map((d) => d.month);
  const labelsToShow = selectedLabels.length > 0 ? selectedLabels : allLabels;

  const totalVOC =
    selectedMonth === "전체"
      ? monthlyData.reduce((acc, cur) => {
          return acc + allLabels.reduce((s, l) => s + (cur[l] as number), 0);
        }, 0)
      : dailyData.reduce((acc, cur) => {
          return acc + allLabels.reduce((s, l) => s + (cur[l] as number), 0);
        }, 0);

  const toggleLabel = (label: string) => {
    setSelectedLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  return (
    <div style={{ maxWidth: 1000, margin: "auto", padding: 20 }}>
      <div style={{ marginBottom: 12, fontWeight: "bold" }}>
        현재 선택된 기간: {selectedMonth}
      </div>

      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => setSelectedMonth("전체")}
          style={{
            margin: 4,
            padding: "6px 12px",
            backgroundColor: selectedMonth === "전체" ? "#007bff" : "#ddd",
            color: selectedMonth === "전체" ? "#fff" : "#000",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          전체
        </button>
        {months.map((month) => (
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
              cursor: "pointer",
            }}
          >
            {month}
          </button>
        ))}
      </div>

      {/* ✅ 체크박스: 항상 동일한 라벨 순서로 고정 */}
      <div
        style={{
          marginBottom: 20,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "center",
        }}
      >
        {allLabels.map((label) => (
          <label
            key={label}
            style={{
              userSelect: "none",
              padding: "4px 8px",
              borderRadius: 4,
              border: selectedLabels.includes(label)
                ? "2px solid #007bff"
                : "2px solid #ccc",
              backgroundColor: selectedLabels.includes(label)
                ? "#cce5ff"
                : "#f8f9fa",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={selectedLabels.includes(label)}
              onChange={() => toggleLabel(label)}
              style={{ marginRight: 6 }}
            />
            {label}
          </label>
        ))}
      </div>

      <h3 style={{ marginBottom: 10 }}>
        {selectedMonth === "전체"
          ? `전체 VOC (${totalVOC}건)`
          : `${selectedMonth} VOC (${totalVOC}건)`}
      </h3>

      <ResponsiveContainer width="100%" height={600}>
        <LineChart
          data={selectedMonth === "전체" ? monthlyData : dailyData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <XAxis
            dataKey={selectedMonth === "전체" ? "month" : "day"}
            tickFormatter={(str) =>
              selectedMonth === "전체" ? str : dayjs(str).format("DD")
            }
            interval={0}
            minTickGap={5}
          />
          <YAxis allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="top" height={36} />
          {labelsToShow.map((label, idx) => (
            <Line
              key={label}
              type="linear"
              dataKey={label}
              stroke={`hsl(${(idx * 47) % 360}, 70%, 50%)`}
              strokeWidth={2}
              dot={{ r: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
