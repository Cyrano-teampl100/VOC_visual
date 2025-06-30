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

const extractAllLabels = (data: any[]) => {
  const set = new Set<string>();
  data.forEach((row) => {
    if (typeof row.label === "string" && row.label.trim() !== "") {
      row.label.split(",").map((l: string) => set.add(l.trim()));
    }
  });
  return Array.from(set).sort();
};

function groupByMonthAndLabel(data: any[], allLabels: string[]) {
  const stats: Record<string, Record<string, number>> = {};
  data.forEach((row) => {
    const date = dayjs(row.latestUserDate);
    if (!date.isValid()) return;
    const month = date.format("YYYY-MM");
    if (!stats[month]) stats[month] = {};
    const labels = row.label?.split(",").map((l: string) => l.trim()) || [];
    labels.forEach((label: string) => {
      if (!stats[month][label]) stats[month][label] = 0;
      stats[month][label] += 1;
    });
  });

  return Object.entries(stats).map(([month, labelMap]) => {
    const filled: Record<string, number | string> = { month };
    allLabels.forEach((label: string) => {
      filled[label] = labelMap[label] || 0;
    });
    return filled;
  }).sort((a, b) => dayjs(a.month as string).unix() - dayjs(b.month as string).unix());
}

function groupByDayAndLabelWithFill(data: any[], targetMonth: string, allLabels: string[]) {
  const stats: Record<string, Record<string, number>> = {};

  data
    .filter((row) => dayjs(row.latestUserDate).format("YYYY-MM") === targetMonth)
    .forEach((row) => {
      const day = dayjs(row.latestUserDate).format("YYYY-MM-DD");
      const labels = row.label?.split(",").map((l: string) => l.trim()) || [];
      if (!stats[day]) stats[day] = {};
      labels.forEach((label: string) => {
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

const CustomTick = (props: any) => {
  const { x, y, payload } = props;
  const dateStr = payload.value;
  const day = dayjs(dateStr);
  const dayOfWeek = day.day(); // 0: 일, 6: 토
  const color = dayOfWeek === 0 ? "red" : dayOfWeek === 6 ? "blue" : "#666";
  return (
    <text x={x} y={y + 10} textAnchor="middle" fontSize={12} fill={color}>
      {day.format("DD")}
    </text>
  );
};

// 툴팁
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

// 스타일 유틸
const buttonStyle = (active: boolean) => ({
  margin: 4,
  padding: "6px 12px",
  backgroundColor: active ? "#007bff" : "#ddd",
  color: active ? "#fff" : "#000",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
});

const checkboxStyle = (active: boolean): React.CSSProperties => ({
  userSelect: "none",
  padding: "4px 8px",
  borderRadius: 4,
  border: active ? "2px solid #007bff" : "2px solid #ccc",
  backgroundColor: active ? "#cce5ff" : "#f8f9fa",
  cursor: "pointer",
});

export default function ChartLine() {
  const allLabels = extractAllLabels(rawData);
  const [selectedMonth, setSelectedMonth] = useState<string>("전체");
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [clickedDate, setClickedDate] = useState<string | null>(null);

  useEffect(() => {
    setMonthlyData(groupByMonthAndLabel(rawData, allLabels));
  }, []);

  useEffect(() => {
    setSelectedLabels([]);
    setClickedDate(null);
    if (selectedMonth !== "전체") {
      setDailyData(groupByDayAndLabelWithFill(rawData, selectedMonth, allLabels));
    }
  }, [selectedMonth]);

  const labelsToShow = selectedLabels.length > 0 ? selectedLabels : allLabels;
  const months = monthlyData.map((d) => d.month);

  const toggleLabel = (label: string) => {
    setSelectedLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const filteredRaw = rawData.filter((d) => {
    const dateMatch = clickedDate ? dayjs(d.latestUserDate).format("YYYY-MM-DD") === clickedDate : false;
    const labelMatch = selectedLabels.length === 0 || selectedLabels.some((l) => d.label?.includes(l));
    return dateMatch && labelMatch;
  });

  return (
    <div style={{ display: "flex", height: "100%", minHeight: "800px" }}>
      {/* 좌측: 그래프와 라벨 필터 */}
      <div style={{ flex: 2, padding: 20 }}>
        <div style={{ marginBottom: 12, fontWeight: "bold" }}>
          현재 선택된 기간: {selectedMonth}
        </div>

        <div style={{ marginBottom: 16 }}>
          <button onClick={() => setSelectedMonth("전체")} style={buttonStyle(selectedMonth === "전체")}>
            전체
          </button>
          {months.map((month) => (
            <button key={month} onClick={() => setSelectedMonth(month)} style={buttonStyle(selectedMonth === month)}>
              {month}
            </button>
          ))}
        </div>

        {/* 라벨 필터 */}
        <div style={{
          marginBottom: 20,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "center",
        }}>
          {allLabels.map((label) => (
            <label key={label} style={checkboxStyle(selectedLabels.includes(label))}>
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
          {selectedMonth === "전체" ? `전체 VOC` : `${selectedMonth} VOC`}
        </h3>

        <ResponsiveContainer width="100%" height={500}>
          <LineChart
            data={selectedMonth === "전체" ? monthlyData : dailyData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            onClick={(e) => {
              if (e && e.activeLabel && selectedMonth !== "전체") {
                setClickedDate(e.activeLabel); // YYYY-MM-DD
              }
            }}
          >
            <XAxis
              dataKey={selectedMonth === "전체" ? "month" : "day"}
              tick={selectedMonth === "전체" ? undefined : <CustomTick />}
              tickFormatter={(str) =>
                selectedMonth === "전체" ? str : undefined
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

      {/* 우측: 클릭된 VOC 데이터 목록 */}
      <div style={{ flex: 1, borderLeft: "1px solid #ccc", padding: 20, overflowY: "auto" }}>
        <h4>{clickedDate || "일자를 클릭해주세요"}</h4>
        {clickedDate && filteredRaw.length === 0 && (
          <div>해당 날짜에 해당 라벨의 데이터가 없습니다.</div>
        )}
        {filteredRaw.map((item, idx) => {
              const sheetId = "1iItW4KpAhTbQ58fBstohkW0J09uOcwGXsNZfInw_xqs";  // 실제 문서 ID로 교체하세요
              const gid = "802777913";  // 알려주신 gid 값
              const rowIndex = rawData.findIndex(row => row.chatId === item.chatId);
              const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=${gid}&range=A${rowIndex + 2}`;

              return (
                <div
                  key={idx}
                  style={{
                    marginBottom: 16,
                    borderBottom: "1px dashed #ddd",
                    paddingBottom: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <div style={{ fontWeight: "bold" }}>{item.label}</div>
                    <a
                      href={sheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 12,
                        textDecoration: "underline",
                        color: "#007bff",
                        cursor: "pointer",
                      }}
                    >
                      구글시트에서 보기 →
                    </a>
                  </div>
                  <div style={{ fontWeight: "bold", marginBottom: 4 }}>
                    {item.latestUserDate}
                  </div>
                  <div style={{ whiteSpace: "pre-line" }}>{item.chatText}</div>
                </div>
              );
            })}

      </div>
    </div>
  );
}


