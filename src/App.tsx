import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Footer } from "./components/ui/footer";
import { HomePage } from "./pages/Home";
import { SearchResultsPage } from "./pages/SearchResults";
import { ObjectDetailsPage } from "./pages/ObjectDetails";
import { NotFoundPage } from "./pages/NotFound";
import { TableDetailsPage } from "./pages/TableDetails";

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
          path="/table/:tableName"
          element={
            <Layout>
              <TableDetailsPage />
            </Layout>
          }
        />
        <Route
          path="*"
          element={
            <Layout>
              <NotFoundPage />
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
