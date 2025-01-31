import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

function ProtectedRoute(WrappedComponent) {
  // We return a new function component that uses hooks at the top level
  function ProtectedComponent(props) {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
      } else {
        setIsAuthenticated(true);
      }
      setLoading(false);
    }, [router]);

    // Display nothing while checking auth
    if (loading) return null;

    // If authenticated, render the wrapped component
    return isAuthenticated ? <WrappedComponent {...props} /> : null;
  }

  // Give the component a displayName for better debugging
  ProtectedComponent.displayName = `ProtectedRoute(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return ProtectedComponent;
}

export default ProtectedRoute;
