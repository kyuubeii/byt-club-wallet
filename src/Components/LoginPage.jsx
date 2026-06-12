import {
    Badge,
    Button,
    Group,
    PasswordInput,
    Paper,
    Stack,
    Text,
    TextInput,
    Title,
} from "@mantine/core";

const BYT_WHATSAPP_NUMBER = "60142889116";
const WALK_IN_INQUIRY_MESSAGE = `Hi BYT, I would like to ask if there is any walk-in slot available for the next badminton session.

Name:
Preferred session date:
Number of walk-in player(s):`;

function LoginPage({
    authNotice,
    email,
    setEmail,
    password,
    setPassword,
    handleLogin,
    setPage,
}) {
    function handleWalkInInquiry() {
        const url = `https://wa.me/${BYT_WHATSAPP_NUMBER}?text=${encodeURIComponent(
            WALK_IN_INQUIRY_MESSAGE
        )}`;

        window.open(url, "_blank", "noopener,noreferrer");
    }

    return (
        <div className="page">
            <Paper className="login-card premium-auth-card" shadow="xl">
                <Stack gap="lg">
                    <Group justify="space-between" align="flex-start">
                        <div className="logo-box">
                            <img src="/byt-logo.jpeg" alt="BYT Logo" />
                        </div>
                        <Badge className="premium-badge" variant="light">
                            Club Wallet
                        </Badge>
                    </Group>

                    <div>
                        <Title order={1}>BYT Club Wallet</Title>
                        <Text className="subtitle">
                            Premium club management for reloads, sessions, expenses and member balances.
                        </Text>
                    </div>

                    {authNotice && <div className="auth-notice">{authNotice}</div>}

                    <Stack className="form" gap="md">
                        <TextInput
                            label="Email / Phone"
                            placeholder="Enter email or member ID"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                        />

                        <PasswordInput
                            label="Password"
                            placeholder="Enter password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                        />

                        <Button className="login-button" onClick={handleLogin} size="lg">
                            Login
                        </Button>
                        <Button
                            className="register-link-button"
                            variant="light"
                            onClick={() => setPage("register")}
                        >
                            New Member Register
                        </Button>
                        <Button
                            className="walkin-inquiry-button"
                            variant="subtle"
                            onClick={handleWalkInInquiry}
                        >
                            Walk-in Inquiry
                        </Button>
                    </Stack>
                </Stack>
            </Paper>
        </div>
    );
}

export default LoginPage;
