#!/usr/bin/env python3.5
# -*- coding: utf-8 -*-
from setuptools import find_packages
from distutils.core import setup
from distutils.extension import Extension
#from Cython.Distutils import build_ext
#from Cython.Build import cythonize
import noname_app

with open("requirements.txt") as f:
    requirements = f.read().split('\n')

exts = [Extension("noname_app.helpers.cy_misc",
                  ["noname_app/helpers/cy_misc.pyx"], ["."],
                  extra_compile_args=["-O3"]),
        Extension("noname_app.helpers.transform",
                  ["noname_app/helpers/transform.pyx"], ["."],
                  extra_compile_args=["-O3"]),
        Extension("noname_app.helpers.cartogram_doug",
                  ["noname_app/helpers/cartogram_doug.pyx"], ["."],
                  extra_compile_args=["-O3"])
        ]

setup(
    name='magrit_app',
    version=noname_app.__version__,
    description="",
    url='https://github.com/mthh/magrit',
    packages=find_packages(),
    setup_requires=['setuptools>=25.1', 'Cython>=0.24'],
    ext_modules=exts,
    install_requires=requirements,
    test_suite='tests',
    include_package_data=True,
    entry_points={
        'console_scripts': [
            'magrit=noname_app.app:main',
        ],
    },
)
