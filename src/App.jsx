import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { useSupabaseAuth, SupabaseAuthProvider } from '@/components/context/SupabaseAuthContext';
import Login from '@/components/Login';
import FinanceiroCalculadoraFinanciamento from './pages/FinanceiroCalculadoraFinanciamento.jsx';
import EstoqueControlePage from './pages/EstoqueControlePage.jsx';
import CRMPage from './pages/CRMPage.jsx';
import CRMRelatoriosPage from './pages/CRMRelatoriosPage.jsx';
import CRMDetalhePage from './pages/CRMDetalhePage.jsx';
import CRMTarefasPage from './pages/CRMTarefasPage.jsx';
import CRMDashboardPage from './pages/CRMDashboardPage.jsx';
import CustoProdutoPage from './pages/CustoProdutoPage.jsx';
import InformacoesPage from './pages/InformacoesPage.jsx';
import HistoricoPrecosPage from './pages/HistoricoPrecosPage.jsx';
import MetasCustosPage from './pages/MetasCustosPage.jsx';
import SistemaAlertasPage from './pages/SistemaAlertasPage.jsx';
import DeployManagerV2 from './pages/DeployManagerV2.jsx';
import DeployManagerSaaS from './pages/DeployManagerSaaS.jsx';
import { GlobalAlertProvider } from '@/components/GlobalAlertDialog';


const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { ready, session } = useSupabaseAuth();

  if (!ready) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route
        path="/InformacoesPage"
        element={
          <LayoutWrapper currentPageName="InformacoesPage">
            <InformacoesPage />
          </LayoutWrapper>
        }
      />
      <Route
        path="/FinanceiroCalculadoraFinanciamento"
        element={
          <LayoutWrapper currentPageName="FinanceiroCalculadoraFinanciamento">
            <FinanceiroCalculadoraFinanciamento />
          </LayoutWrapper>
        }
      />
      <Route
        path="/EstoqueControlePage"
        element={
          <LayoutWrapper currentPageName="EstoqueControlePage">
            <EstoqueControlePage />
          </LayoutWrapper>
        }
      />
      <Route
        path="/CRMPage"
        element={
          <LayoutWrapper currentPageName="CRMPage">
            <CRMPage />
          </LayoutWrapper>
        }
      />
      <Route
        path="/CRMRelatoriosPage"
        element={
          <LayoutWrapper currentPageName="CRMRelatoriosPage">
            <CRMRelatoriosPage />
          </LayoutWrapper>
        }
      />
      <Route
        path="/CRMDetalhePage"
        element={
          <LayoutWrapper currentPageName="CRMDetalhePage">
            <CRMDetalhePage />
          </LayoutWrapper>
        }
      />
      <Route
        path="/CRMTarefasPage"
        element={
          <LayoutWrapper currentPageName="CRMTarefasPage">
            <CRMTarefasPage />
          </LayoutWrapper>
        }
      />
      <Route
        path="/CRMDashboardPage"
        element={
          <LayoutWrapper currentPageName="CRMDashboardPage">
            <CRMDashboardPage />
          </LayoutWrapper>
        }
      />
      <Route
        path="/CustoProdutoPage"
        element={
          <LayoutWrapper currentPageName="CustoProdutoPage">
            <CustoProdutoPage />
          </LayoutWrapper>
        }
      />
      <Route
        path="/HistoricoPrecosPage"
        element={
          <LayoutWrapper currentPageName="HistoricoPrecosPage">
            <HistoricoPrecosPage />
          </LayoutWrapper>
        }
      />
      <Route
        path="/MetasCustosPage"
        element={
          <LayoutWrapper currentPageName="MetasCustosPage">
            <MetasCustosPage />
          </LayoutWrapper>
        }
      />
      <Route
        path="/SistemaAlertasPage"
        element={
          <LayoutWrapper currentPageName="SistemaAlertasPage">
            <SistemaAlertasPage />
          </LayoutWrapper>
        }
      />
      <Route
        path="/DeployManagerV2"
        element={
          <LayoutWrapper currentPageName="DeployManagerV2">
            <DeployManagerV2 />
          </LayoutWrapper>
        }
      />
      <Route
        path="/DeployManagerSaaS"
        element={
          <LayoutWrapper currentPageName="DeployManagerSaaS">
            <DeployManagerSaaS />
          </LayoutWrapper>
        }
      />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <SupabaseAuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <GlobalAlertProvider>
            <Router>
              <AuthenticatedApp />
            </Router>
            <Toaster />
          </GlobalAlertProvider>
        </QueryClientProvider>
    </SupabaseAuthProvider>
  )
}

export default App