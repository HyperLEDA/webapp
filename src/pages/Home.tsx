import { useNavigate } from "react-router-dom";
import { SearchBar } from "../components/ui/searchbar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const homePageHint = `
Examples:
- Search by name: [name:IC1445](/query?q=name:IC1445)
- Search by PGC number: [pgc:112642](/query?q=pgc:112642)

The search conditions can be concatenated with AND or OR operators. For example:
- Search by name and PGC number: [name:IC1445 and pgc:112642](/query?q=name:IC1445%20AND%20pgc:112642)
- Search by name or PGC number: [name:IC4445 or pgc:87422](/query?q=name:IC1445%20OR%20pgc:112642)
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
