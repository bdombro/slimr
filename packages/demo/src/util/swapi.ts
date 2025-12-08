export interface IFilm {
	characters: string[] | IPeople[]
	created: Date
	director: string
	edited: Date
	episode_id: string
	opening_crawl: string
	planets: string[] | IPlanet[]
	producer: string
	release_date: Date
	species: string[] | ISpecie[]
	starships: string[] | IStarship[]
	title: string
	url: string
	vehicles: string[] | IVehicle[]
}
export interface IPeople {
	birth_year: string
	eye_color: string
	films: string[] | IFilm[]
	gender: string
	hair_color: string
	height: string
	homeworld: string | IPlanet
	mass: string
	name: string
	skin_color: string
	created: Date
	edited: Date
	species: string[] | ISpecie[]
	starships: string[] | IStarship[]
	url: string
	vehicles: string[] | IVehicle[]
}
export interface IPlanet {
	climate: string
	created: Date
	diameter: string
	edited: Date
	films: string[] | IFilm[]
	gravity: string
	name: string
	orbital_period: string
	population: string
	residents: string[] | IPeople[]
	rotation_period: string
	surface_water: string
	terrain: string
	url: string
}
export interface ISpecie {
	average_height: string
	average_lifespan: string
	classification: string
	created: Date
	designation: string
	edited: Date
	eye_colors: string
	hair_colors: string
	homeworld: string | IPlanet
	language: string
	name: string
	people: string[] | IPeople[]
	films: string[] | IFilm[]
	skin_colors: string
	url: string
}
export interface IStarship {
	MGLT: string
	cargo_capacity: string
	consumables: string
	cost_in_credits: string
	created: Date
	crew: string
	edited: Date
	hyperdrive_rating: string
	length: string
	manufacturer: string
	max_atmosphering_speed: string
	model: string
	name: string
	passengers: string
	films: string[] | IFilm[]
	pilots: string[] | IPeople[]
	starship_class: string
	url: string
}
export interface IVehicle {
	cargo_capacity: string
	consumables: string
	cost_in_credits: string
	created: Date
	crew: string
	edited: Date
	length: string
	manufacturer: string
	max_atmosphering_speed: string
	model: string
	name: string
	passengers: string
	pilots: string[] | IPeople[]
	films: string[] | IFilm[]
	url: string
	vehicle_class: string
}

export type IError = Error

export enum ResourcesType {
	Films = "films",
	People = "people",
	Planets = "planets",
	Species = "species",
	Starships = "starships",
	Vehicles = "vehicles",
}

/**
 * Fetches a resource from the SWAPI based on relative url
 */
async function request(url: string) {
	const result = await fetch(`https://swapi.dev/api/${url}`, {
		headers: { accept: "application/json" },
	}).then((res) => res.json())
	return result.results
}

class SWCollection<R> {
	resource: string
	cache = new Map<
		/** A cache key = url to fetch or a uuid */
		string,
		{
			/** createdAt timestamp */
			t: number
			/** Value of the cache */
			v: R[]
		}
	>()

	constructor(resource: string) {
		this.resource = resource
	}

	// If you forsee the cache leaking too much, you may implement a garbage collector
	// garbageCollect() {
	// }

	getPage(
		page = 1,
		// search?: string
	): Promise<R[]> {
		// const searchQs = search ? `&search=${search}` : ''
		// const uri = `${this.resource}?page=${page}${searchQs}`
		// const match = this.cache.get(uri)
		return request(`${this.resource}?page=${page}`)
		// return {
		//   // Cache value or undefined
		//   cached: match?.v,
		//   // Age of cache in ms
		//   age: match?.t ? Date.now() - match.t : 0,
		//   refresh: () =>
		//     request(`${this.resource}?page=${page}`)
		//       .then((v) => {
		//         this.cache.set(uri, {t: Date.now(), v})
		//         return v
		//       })
		//       .catch((e) => e),
		// }
	}
}

export const Films = new SWCollection<IFilm>(ResourcesType.Films)
export const People = new SWCollection<IPeople>(ResourcesType.People)
export const Planets = new SWCollection<IPlanet>(ResourcesType.Planets)
export const Species = new SWCollection<ISpecie>(ResourcesType.Species)
export const Starships = new SWCollection<IStarship>(ResourcesType.Starships)
export const Vehicles = new SWCollection<IVehicle>(ResourcesType.Vehicles)
