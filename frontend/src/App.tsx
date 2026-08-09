import { Dashboard } from "./pages/Dashboard";
import { BrowserRouter, Routes, Route,Navigate } from "react-router-dom";
import { SendMoney } from "./pages/SendMoney";
import { Signin } from "./pages/Signin";
import { Signup } from "./pages/Signup";
import { Toaster } from "react-hot-toast";
import { ProtectedRoute } from "./components/ProtectedRoutes";

function App() {
  return (<>
  <Toaster position="top-right" />
    <BrowserRouter>
      <Routes>
         <Route path="/" element={<Navigate to="/signin" replace />} />
    <Route path="/signup" element={<Signup />} />

    <Route path="/signin" element={<Signin />} />

    <Route
        path="/dashboard"
        element={
            <ProtectedRoute>
                <Dashboard />
            </ProtectedRoute>
        }
    />

    <Route
        path="/send"
        element={
            <ProtectedRoute>
                <SendMoney />
            </ProtectedRoute>
        }
    />
</Routes>
    </BrowserRouter>
    </>
    
     
  );
}

export default App;