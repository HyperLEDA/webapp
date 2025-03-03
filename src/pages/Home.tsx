import { useNavigate } from "react-router-dom";
import { SearchBar } from "../components/ui/searchbar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const homePageHint = `
Examples:
- Search by name:
	- Simple: [IC1445](/query?q=IC1445)
`;

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const handleSearch = (query: string) => {
    navigate(`/query?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="p-4">
      <SearchBar onSearch={handleSearch} logoSize="large" />
      <div className="max-w-4xl mx-auto mt-8 prose prose-invert leading-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {homePageHint}
        </ReactMarkdown>
      </div>
    </div>
  );
};
