# language-service/media-crop Specification

## Purpose

Clamping the rectangle a CROP names to the image as loaded, so a host draws only the part of the picture that exists.

## Requirements

### Requirement: A CROP is clamped to the image a host loaded

`drawnCrop(crop, naturalWidth, naturalHeight)` SHALL return the part of the `crop` rectangle that lies inside an image of the given size, or `null` when either size is not positive or the rectangle and the image do not overlap, `null` meaning the whole image is drawn.

#### Scenario: A rectangle inside the image

- **WHEN** `{ top: 10, left: 20, width: 30, height: 40 }` is clamped to 100 by 100
- **THEN** the result is the same rectangle

#### Scenario: A rectangle past the image's edge

- **WHEN** `{ top: 80, left: 90, width: 50, height: 50 }` is clamped to 100 by 100
- **THEN** the result is `{ top: 80, left: 90, width: 10, height: 20 }`

#### Scenario: A rectangle the image does not reach

- **WHEN** `{ top: 200, left: 0, width: 10, height: 10 }` is clamped to 100 by 100
- **THEN** the result is `null`

#### Scenario: A rectangle that starts before the image

- **WHEN** `{ top: -10, left: -20, width: 50, height: 50 }` is clamped to 100 by 100
- **THEN** the result is `{ top: 0, left: 0, width: 30, height: 40 }`

#### Scenario: An image with no size yet

- **WHEN** any rectangle is clamped to 0 by 100
- **THEN** the result is `null`
