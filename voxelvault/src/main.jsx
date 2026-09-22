import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import "./index.css";
import App from "./App";
import AuthProvider from "./auth/AuthProvider";

const router=createBrowserRouter([{path:'*',element:<AuthProvider><App /></AuthProvider>}]);
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router}/>
  </StrictMode>,
);
