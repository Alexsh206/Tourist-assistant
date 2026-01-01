export default function Navbar({ onLogout }) {
    return (
        <div className="p-4 bg-gray-200">
            <button onClick={onLogout}>Logout</button>
        </div>
    );
}
