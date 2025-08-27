import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Footer } from "./components/ui/footer";
import { HomePage } from "./pages/Home";
import { SearchResultsPage } from "./pages/SearchResults";
import { ObjectDetailsPage } from "./pages/ObjectDetails";
import FlexibleTableDemo from "./pages/FlexibleTableDemo";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-grow">{children}</div>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <HomePage />
            </Layout>
          }
        />
        <Route
          path="/query"
          element={
            <Layout>
              <SearchResultsPage />
            </Layout>
          }
        />
        <Route
          path="/object/:pgcId"
          element={
            <Layout>
              <ObjectDetailsPage />
            </Layout>
          }
        />
        <Route
          path="/table-demo"
          element={
            <Layout>
              <FlexibleTableDemo />
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
