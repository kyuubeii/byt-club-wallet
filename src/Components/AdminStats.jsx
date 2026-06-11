import { Card, Group, RingProgress, Stack, Text, Title } from "@mantine/core";

function AdminStats({
  totalClubBalance,
  activeMemberCount,
  pendingRequestCount,
  negativeBalanceCount,
  formatMoney,
}) {
  const stats = [
    {
      label: "Total Club Balance",
      value: formatMoney(totalClubBalance),
      tone: "positive",
      progress: 78,
    },
    {
      label: "Active Members",
      value: activeMemberCount,
      tone: "neutral",
      progress: 66,
    },
    {
      label: "Pending Reload",
      value: pendingRequestCount,
      tone: "warning",
      progress: 36,
    },
    {
      label: "Negative Balance",
      value: negativeBalanceCount,
      tone: "danger",
      progress: 22,
    },
  ];

  return (
    <div className="stats-grid">
      {stats.map((stat) => (
        <Card className={`stat-card stat-card-${stat.tone}`} key={stat.label}>
          <Group justify="space-between" align="center" wrap="nowrap">
            <Stack gap={6}>
              <Text>{stat.label}</Text>
              <Title order={3}>{stat.value}</Title>
            </Stack>
            <RingProgress
              size={56}
              thickness={5}
              sections={[
                {
                  value: stat.progress,
                  color: stat.tone === "danger" ? "red" : stat.tone === "warning" ? "yellow" : "lime",
                },
              ]}
            />
          </Group>
        </Card>
      ))}
    </div>
  );
}

export default AdminStats;
