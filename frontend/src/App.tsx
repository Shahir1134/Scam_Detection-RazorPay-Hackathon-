import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { TransactionDetail } from './pages/TransactionDetail';
import { Accounts } from './pages/Accounts';
import { AccountDetail } from './pages/AccountDetail';
import { FraudNetworks } from './pages/FraudNetworks';
import { Cases } from './pages/Cases';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="transactions/:id" element={<TransactionDetail />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="accounts/:id" element={<AccountDetail />} />
          <Route path="networks" element={<FraudNetworks />} />
          <Route path="cases" element={<Cases />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}


export default App;
