function LoginPage({
    authNotice,
    email,
    setEmail,
    password,
    setPassword,
    handleLogin,
    setPage,
}) {
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
                </div>

                <div className="demo-box">
                    <p>Demo Account</p>
                    <p>Admin: admin@byt.club / 123456</p>
                    <p>Member: gordon@byt.club / 123456</p>
                </div>

                <p className="footer-text">Prototype version · BYT Club Wallet</p>
            </div>
        </div>
    );
}

export default LoginPage;
