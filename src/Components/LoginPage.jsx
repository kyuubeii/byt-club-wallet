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
            <div className="login-card">
                <div className="logo-box">BYT</div>

                <h1>BYT Club Wallet</h1>
                <p className="subtitle">
                    Club management system for reload, expenses and member balance.
                </p>

                {authNotice && <div className="auth-notice">{authNotice}</div>}

                <div className="form">
                    <label>Email / Phone</label>
                    <input
                        type="text"
                        placeholder="admin@byt.club"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                    />

                    <label>Password</label>
                    <input
                        type="password"
                        placeholder="Enter password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />

                    <button className="login-button" onClick={handleLogin}>
                        Login
                    </button>
                    <button
                        className="register-link-button"
                        onClick={() => setPage("register")}
                    >
                        New Member Register
                    </button>
                    <button
                        className="walkin-inquiry-button"
                        onClick={handleWalkInInquiry}
                    >
                        Walk-in Inquiry
                    </button>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
