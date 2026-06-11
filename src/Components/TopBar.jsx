import { Badge, Button, Group, Paper, Stack, Text, Title } from "@mantine/core";

function TopBar({
  title,
  subtitle,
  onLogout,
  showResetButton = false,
  onReset,
}) {
  return (
    <Paper className="topbar" component="header" shadow="sm">
      <Group justify="space-between" align="center" w="100%">
        <Group gap="md" align="center">
          <div className="logo-box topbar-logo">
            <img src="/byt-logo.jpeg" alt="BYT Logo" />
          </div>
          <Stack gap={2}>
            <Group gap="xs">
              <Title order={2}>{title}</Title>
              <Badge className="premium-badge" variant="light">
                Live
              </Badge>
            </Group>
            <Text>{subtitle}</Text>
          </Stack>
        </Group>

        <Group className="topbar-actions" gap="sm">
          {showResetButton && (
            <Button className="reset-button" variant="light" onClick={onReset}>
              Reset Demo Data
            </Button>
          )}

          <Button className="logout-button" variant="outline" onClick={onLogout}>
            Logout
          </Button>
        </Group>
      </Group>
    </Paper>
  );
}

export default TopBar;
