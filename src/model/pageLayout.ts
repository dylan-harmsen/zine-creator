// A page's size and bleed, and the part of an image it shows. A merged pair
// lays one image out across both pages, and each page draws its own share.

import { bleedEdges, type Edges } from '../imposition/edges'
import { MODES } from '../imposition/modes'
import { pageSize } from '../imposition/orientation'
import { layoutImage, type ImageLayout } from './imageLayout'
import { imageOwner } from './spreads'
import type { PageImage, Project } from './types'

export interface PageFrame {
  /** Trim size in mm, in the page's upright frame. */
  width: number
  height: number
  bleed: Edges
}

export function pageFrame(project: Project, index: number, bleedOn = project.bleed): PageFrame {
  return {
    ...pageSize(MODES[project.mode], project.orientation),
    bleed: bleedEdges(project.mode, bleedOn, index + 1, project.orientation),
  }
}

export interface ImagePlacement {
  /** Index of the page holding the image; its pan and zoom apply. */
  ownerIndex: number
  image: PageImage
  /** Whether the image spans a merged pair. */
  spread: boolean
  /** Where the image lands, in mm relative to this page's trim box. */
  layout: ImageLayout
}

export function placeImage(project: Project, index: number, bleedOn = project.bleed): ImagePlacement | null {
  const ownerIndex = imageOwner(project.pages, index)
  const owner = project.pages[ownerIndex]
  if (!owner.image) return null
  const first = pageFrame(project, ownerIndex, bleedOn)
  if (!owner.mergedWithNext) {
    return { ownerIndex, image: owner.image, spread: false, layout: layoutImage(owner.image, first.width, first.height, first.bleed) }
  }

  // The second page sits to the right of the first, or below it when landscape.
  const second = pageFrame(project, ownerIndex + 1, bleedOn)
  const dx = project.orientation === 'portrait' ? first.width : 0
  const dy = project.orientation === 'portrait' ? 0 : first.height
  // Bleed of the box enclosing both pages' bleed boxes.
  const bleed: Edges = {
    top: Math.max(first.bleed.top, second.bleed.top - dy),
    right: Math.max(first.bleed.right - dx, second.bleed.right),
    bottom: Math.max(first.bleed.bottom - dy, second.bleed.bottom),
    left: Math.max(first.bleed.left, second.bleed.left - dx),
  }
  const layout = layoutImage(owner.image, first.width + dx, first.height + dy, bleed)
  if (index !== ownerIndex) {
    layout.x -= dx
    layout.y -= dy
  }
  return { ownerIndex, image: owner.image, spread: true, layout }
}
