import {Router} from '@slimr/router'

import Form from './pages/form'
import Home from './pages/index'
import NotFound from './pages/not-found'
import Planets from './pages/planets'
import PlanetsByPage from './pages/planets-by-page'
import StackTest from './pages/stack-test'

// FIXME: maybe if component = () => Home(), we could avoid cyclic dependencies
export const router = new Router(
  {
    index: {
      component: Home,
      path: '/',
    },
    form: {
      component: Form,
      path: '/form',
    },
    planets: {
      isStack: true,
      component: Planets,
      path: '/planets',
    },
    planetsByPage: {
      component: PlanetsByPage,
      path: '/planets/:page',
    },
    stack1: {
      isStack: true,
      component: StackTest,
      path: '/stack1',
    },
    stack1Inner: {
      exact: false,
      component: StackTest,
      path: '/stack1',
    },
    notFound: {
      exact: false,
      component: NotFound,
      path: '/',
    },
  },
  {
    scrollElSelector: 'main',
  }
)
