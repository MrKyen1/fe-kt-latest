import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { Layout as AntLayout } from 'antd';

export default function Layout() {
  return (
    <AntLayout className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <Header />
      <AntLayout.Content className="flex-1 flex flex-col">
        <Outlet />
      </AntLayout.Content>
      <Footer />
    </AntLayout>
  );
}
