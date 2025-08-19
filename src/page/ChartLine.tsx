import rawData from "../../exported_data.json";
import { useEffect, useState } from "react";
import { ReferenceLine } from "recharts";
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

type Row = {
  chatId: string;
  chatText: string;
  label: string;
  latestUserDate?: string;
  firstUserDate?: string;
};
const getDateStr = (row: Row) => row.latestUserDate ?? row.firstUserDate ?? "";

// 유효한 데이터만 추출 (예: 2025년에 생성된 채팅방만)
const validRawData = (rawData as Row[]).filter((row) => {
  const d = dayjs(getDateStr(row));
  return d.isValid() && d.year() === 2025;
});

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
    const date = dayjs(getDateStr(row));
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
    .filter((row) => dayjs(getDateStr(row)).format("YYYY-MM") === targetMonth)
    .forEach((row) => {
      const day = dayjs(getDateStr(row)).format("YYYY-MM-DD");
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
  const allLabels = extractAllLabels(validRawData);
  const [selectedLabels, setSelectedLabels] = useState<string[]>(allLabels);
  const [selectedMonth, setSelectedMonth] = useState<string>("전체");
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [clickedDate, setClickedDate] = useState<string | null>(null);
  const isAllSelected = selectedLabels.length === allLabels.length;
  const [sortOption, setSortOption] = useState<"date" | "label">("date");

  useEffect(() => {
    setMonthlyData(groupByMonthAndLabel(validRawData, allLabels));
  }, []);

  useEffect(() => {
    setSelectedLabels(allLabels);
    setClickedDate(null);
    if (selectedMonth !== "전체") {
      setDailyData(groupByDayAndLabelWithFill(validRawData, selectedMonth, allLabels));
    }
  }, [selectedMonth]);

  const labelsToShow = selectedLabels;
  const months = monthlyData.map((d) => d.month);

  const filteredRaw = validRawData.filter((d) => {
    const dateMatch = clickedDate
      ? dayjs(getDateStr(d)).format("YYYY-MM-DD") === clickedDate
      : false;
    const labelMatch = selectedLabels.length === 0 || selectedLabels.some((l) => d.label?.includes(l));
    return dateMatch && labelMatch;
  });

  const toggleSelectAll = () => {
  if (isAllSelected) {
    setSelectedLabels([]);
  } else {
    setSelectedLabels(allLabels);
  }
};

const sortedRaw = [...filteredRaw].sort((a, b) => {
  if (sortOption === "date") {
    return dayjs(getDateStr(a)).unix() - dayjs(getDateStr(b)).unix();
  } else {
    return (a.label || "").localeCompare(b.label || "");
  }
});

  return (
    <div style={{ display: "flex", height: "100%", minHeight: "800px", transition: "all 0.3s ease-in-out", }}>
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
         <label key="전체" style={checkboxStyle(isAllSelected)}>
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleSelectAll}
              style={{ marginRight: 6 }}
            />
            전체
          </label>
          {allLabels.map((label) => (
            <label key={label} style={checkboxStyle(selectedLabels.includes(label))}>
              <input
                type="checkbox"
                checked={selectedLabels.includes(label)}
                onChange={() => {
                  const newSelected = selectedLabels.includes(label)
                    ? selectedLabels.filter((l) => l !== label)
                    : [...selectedLabels, label];

                  setSelectedLabels(newSelected);
                }}
                style={{ marginRight: 6 }}
              />
              {label}
            </label>
          ))}
        </div>

        <h3 style={{ marginBottom: 10 }}>
          {selectedMonth === "전체" ? `전체 VOC` : `${selectedMonth} VOC`}
        </h3>

        {labelsToShow.length === 0 ? (
          <div style={{ textAlign: "center", color: "#888", padding: "100px 0" }}>
            선택된 라벨이 없습니다. 그래프를 보시려면 하나 이상 선택해주세요.
          </div>
        ) : (
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
              {clickedDate && selectedMonth !== "전체" && dailyData.some(d => d.day === clickedDate) && (
                  <ReferenceLine
                    x={clickedDate}
                    stroke="#FF0000"
                    strokeDasharray="3 3"
                    label={{
                      value: clickedDate,
                      position: "insideTop",
                      fill: "#FF0000",
                      fontSize: 12,
                    }}
                  />
                )}


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
        )}
      </div>

      {/* 우측: 클릭된 VOC 데이터 목록 */}
      <div style={{ flex: 1, borderLeft: "1px solid #ccc", padding: 20, overflowY: "auto" }}>
          <label style={{ fontSize: 14, marginRight: 8, fontWeight: "bold" }}>
            정렬 기준:
          </label>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as "date" | "label")}
            style={{ padding: 4 }}
          >
            <option value="date">날짜순</option>
            <option value="label">라벨순</option>
          </select>
        <h4>
          {labelsToShow.length === 0
            ? "라벨을 선택해주세요"
            : clickedDate || "일자를 클릭해주세요"}
        </h4>

        {labelsToShow.length === 0 ? (
          <div style={{ color: "#888" }}>
            그래프를 보시려면 라벨을 하나 이상 선택해주세요.
          </div>
        ) : clickedDate && filteredRaw.length === 0 ? (
          <div>해당 날짜에 해당 라벨의 데이터가 없습니다.</div>
        ) : (
          sortedRaw.map((item, idx) => {
            const sheetId = "1iItW4KpAhTbQ58fBstohkW0J09uOcwGXsNZfInw_xqs";
            const gid = "802777913";
            const rowIndex = rawData.findIndex(row => row.chatId === item.chatId);
            const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=${gid}&range=B${rowIndex + 2}`;

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
                  {getDateStr(item)}
                </div>
                <div style={{ whiteSpace: "pre-line", wordBreak: "break-word" }}>{item.chatText}</div>
              </div>
            );
          })
        )}


      </div>
    </div>
  );
}


